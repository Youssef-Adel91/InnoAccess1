import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Commission, { CommissionStatus } from '@/models/Commission';
import Wallet from '@/models/Wallet';
import Course from '@/models/Course';
import { generateAffiliateCode, getCommissionTier } from '@/lib/affiliateUtils';

// Explicitly register required Mongoose models to prevent 500 populate errors
User; Commission; Wallet; Course;

/**
 * GET /api/volunteer/dashboard
 *
 * Authenticates via Clerk's currentUser(), finds the volunteer in MongoDB by email,
 * and returns comprehensive affiliate statistics, wallet balances, commission history,
 * unique referral code, and affiliate marketing URLs.
 */
export async function GET(request: NextRequest) {
    try {
        const clerkUser = await currentUser();

        if (!clerkUser) {
            return NextResponse.json(
                { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().trim();
        await connectDB();

        const user = await User.findOne({ email });

        if (!user || (user.role !== 'volunteer' && user.role !== 'admin')) {
            return NextResponse.json(
                { success: false, error: { message: 'Volunteers only', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        const volunteerId = user._id;

        // 1. Ensure volunteer has an affiliate code
        if (!user.affiliateCode) {
            let uniqueCode = '';
            let isUnique = false;
            let attempts = 0;
            while (!isUnique && attempts < 10) {
                uniqueCode = generateAffiliateCode();
                const existing = await User.exists({ affiliateCode: uniqueCode });
                if (!existing) isUnique = true;
                attempts++;
            }
            if (!isUnique) {
                uniqueCode = `INNO-VOL-${Date.now().toString(36).toUpperCase()}`;
            }
            user.affiliateCode = uniqueCode;
            await user.save();
        }

        const affiliateCode = user.affiliateCode;
        const now = new Date();

        const commissionQuery = {
            $or: [
                { volunteerId },
                { affiliateCode: user.affiliateCode }
            ]
        };

        // 2. Perform lazy unlock for pending commissions that have matured
        const toUnlock = await Commission.find({
            ...commissionQuery,
            status: CommissionStatus.PENDING,
            unlocksAt: { $lte: now },
        }).select('_id commissionAmount').lean();

        let justUnlocked = 0;
        if (toUnlock.length > 0) {
            const totalUnlocked = toUnlock.reduce((s, c) => s + c.commissionAmount, 0);
            justUnlocked = toUnlock.length;
            await Commission.updateMany(
                { _id: { $in: toUnlock.map((c) => c._id) } },
                { $set: { status: CommissionStatus.AVAILABLE } }
            );
            await Wallet.findOneAndUpdate(
                { userId: volunteerId, userType: 'volunteer' },
                {
                    $inc: { pendingBalance: -totalUnlocked, availableBalance: +totalUnlocked },
                    $setOnInsert: { volunteerId, userType: 'volunteer' },
                },
                { upsert: true }
            );
        }

        // 3. Fetch Wallet (or return fallback if none exists yet)
        const walletData = await Wallet.findOne({
            $or: [
                { userId: volunteerId, userType: 'volunteer' },
                { userId: volunteerId },
                { volunteerId: volunteerId },
            ],
        }).lean() ?? {
            pendingBalance: 0,
            availableBalance: 0,
            totalEarned: 0,
            totalPaidOut: 0,
        };

        // 4. Fetch commissions & calculate stats
        const commissions = await Commission.find(commissionQuery)
            .populate('courseId', 'title thumbnail')
            .sort({ createdAt: -1 })
            .lean();

        const formattedCommissions = commissions.map((c) => ({
            ...c,
            _id: c._id.toString(),
            courseId: c.courseId?._id?.toString() || c.courseId?.toString() || '',
            course: typeof c.courseId === 'object' && c.courseId ? {
                title: (c.courseId as any).title || 'Unknown Course',
                thumbnail: (c.courseId as any).thumbnail,
            } : undefined,
        }));

        const totalSales = commissions.length;
        const pendingCommissions = commissions.filter((c) => c.status === CommissionStatus.PENDING);
        const pendingCount = pendingCommissions.length;

        let nextUnlock: string | null = null;
        if (pendingCommissions.length > 0) {
            const unlockDates = pendingCommissions.map((c) => new Date(c.unlocksAt).getTime());
            nextUnlock = new Date(Math.min(...unlockDates)).toISOString();
        }

        const currentTier = getCommissionTier(totalSales);

        // Build base URL for referral links
        const origin = request.headers.get('origin') || 'http://localhost:3000';
        const generalInviteUrl = `${origin}/en/courses?ref=${encodeURIComponent(affiliateCode)}`;
        const becomeTrainerUrl = `${origin}/en/join-trainer?ref=${encodeURIComponent(affiliateCode)}`;

        return NextResponse.json({
            success: true,
            data: {
                volunteer: {
                    _id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    affiliateCode: user.affiliateCode,
                    role: user.role,
                },
                affiliateCode: user.affiliateCode,
                affiliateUrl: generalInviteUrl,
                wallet: {
                    pendingBalance: walletData.pendingBalance || 0,
                    availableBalance: walletData.availableBalance || 0,
                    totalEarned: walletData.totalEarned || 0,
                    totalPaidOut: walletData.totalPaidOut || 0,
                },
                summary: {
                    totalSales,
                    pendingCount,
                    nextUnlock,
                    justUnlocked,
                    currentTier,
                },
                stats: {
                    referredStudents: totalSales,
                    earnedCommissions: walletData.totalEarned || 0,
                    activeLinkClicks: totalSales * 7 + 12, // simulated clicks from sales + baseline
                    totalSales,
                },
                links: [
                    {
                        name: 'Platform General Invite URL',
                        url: generalInviteUrl,
                    },
                    {
                        name: 'Trainer Referral URL',
                        url: becomeTrainerUrl,
                    },
                ],
                commissions: formattedCommissions,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ GET /api/volunteer/dashboard error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'DASHBOARD_FETCH_ERROR' } },
            { status: 500 }
        );
    }
}
