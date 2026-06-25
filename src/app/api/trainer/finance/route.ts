import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import LedgerEntry, { LedgerEntryType } from '@/models/LedgerEntry';
import Wallet from '@/models/Wallet';
import { Types } from 'mongoose';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        if (session.user.role !== 'trainer') {
            return NextResponse.json(
                { success: false, error: { message: 'Trainers only', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        await connectDB();

        const trainerId = new Types.ObjectId(session.user.id);
        const now = new Date();

        // ── Step 1: Lazy unlock ───────────────────────────────────────────────
        const unlockResult = await LedgerEntry.find({
            userId:     trainerId,
            entryType:  LedgerEntryType.TRAINER_COMMISSION,
            status:     'PENDING',
            unlocksAt:  { $lte: now },
        }).select('_id amount').lean();

        if (unlockResult.length > 0) {
            const unlockedIds      = unlockResult.map((c) => c._id);
            const totalUnlocked    = unlockResult.reduce((sum, c) => sum + c.amount, 0);

            await LedgerEntry.updateMany(
                { _id: { $in: unlockedIds } },
                { $set: { status: 'AVAILABLE' } }
            );

            await Wallet.findOneAndUpdate(
                { userId: trainerId, userType: 'trainer' },
                {
                    $inc: {
                        pendingBalance:   -totalUnlocked,
                        availableBalance: +totalUnlocked,
                    },
                },
                { upsert: true, new: true }
            );

            console.log(
                `✅ Lazy unlock: ${unlockResult.length} trainer commissions (EGP ${totalUnlocked}) ` +
                `unlocked for trainer ${trainerId}`
            );
        }

        // ── Step 2: Fetch commissions with course title ───────────────────────
        const commissions = await LedgerEntry.aggregate([
            { 
                $match: { 
                    userId: trainerId, 
                    entryType: LedgerEntryType.TRAINER_COMMISSION 
                } 
            },
            { $sort:  { createdAt: -1 } },
            {
                $lookup: {
                    from:         'courses',
                    localField:   'courseId',
                    foreignField: '_id',
                    as:           'course',
                    pipeline:     [{ $project: { title: 1 } }],
                },
            },
            { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id:              1,
                    courseId:         1,
                    orderId:          1,
                    amount:           1,
                    status:           1,
                    unlocksAt:        1,
                    createdAt:        1,
                    'course.title':   1,
                },
            },
        ]);

        // ── Step 3: Fetch wallet ─────────
        const wallet = await Wallet.findOne({ userId: trainerId, userType: 'trainer' }).lean() ?? {
            pendingBalance:   0,
            availableBalance: 0,
            totalEarned:      0,
            totalPaidOut:     0,
        };

        // ── Step 4: Compute summary stats ─────────────────────────────────────
        const pendingCount = commissions.filter((c) => c.status === 'PENDING').length;

        const nextUnlock = commissions
            .filter((c) => c.status === 'PENDING' && c.unlocksAt)
            .sort((a, b) => new Date(a.unlocksAt).getTime() - new Date(b.unlocksAt).getTime())[0]
            ?.unlocksAt ?? null;

        const computedPendingBalance = commissions
            .filter((c) => c.status === 'PENDING')
            .reduce((sum, c) => sum + c.amount, 0);

        return NextResponse.json({
            success: true,
            data: {
                commissions,
                wallet: {
                    pendingBalance:   computedPendingBalance,
                    availableBalance: wallet.availableBalance,
                    totalEarned:      wallet.totalEarned,
                    totalPaidOut:     wallet.totalPaidOut,
                },
                summary: {
                    totalSales: commissions.length,
                    pendingCount,
                    nextUnlock,
                    justUnlocked: unlockResult.length,
                },
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Trainer finance fetch error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'FINANCE_ERROR' } },
            { status: 500 }
        );
    }
}
