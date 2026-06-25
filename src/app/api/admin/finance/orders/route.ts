import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import LedgerEntry, { LedgerEntryType } from '@/models/LedgerEntry';
import Order from '@/models/Order';
import Course from '@/models/Course';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ success: false, error: { message: 'Unauthorized' } }, { status: 401 });
        }

        await connectDB();

        // Fetch Ledger Table for Orders
        // We will group by orderId to build the "Order Summary" table
        const orderEntries = await LedgerEntry.find({ orderId: { $ne: null } })
            .populate({ path: 'orderId', select: 'paymentMethod createdAt', model: Order })
            .populate({ path: 'courseId', select: 'title', model: Course })
            .sort({ createdAt: -1 })
            .lean();

        // Group entries by orderId
        const orderMap = new Map();

        for (const entry of orderEntries) {
            const orderIdStr = entry.orderId?._id?.toString() || 'unknown';
            
            if (!orderMap.has(orderIdStr)) {
                orderMap.set(orderIdStr, {
                    id: orderIdStr,
                    date: entry.orderId?.createdAt || entry.createdAt,
                    course: entry.courseId?.title || 'Unknown Course',
                    paymentMethod: entry.orderId?.paymentMethod || 'UNKNOWN',
                    gross: 0,
                    fee: 0,
                    trainerCut: 0,
                    affiliateCut: 0,
                    netProfit: 0,
                });
            }

            const summary = orderMap.get(orderIdStr);

            switch (entry.entryType) {
                case LedgerEntryType.GROSS_REVENUE:
                    summary.gross += entry.amount;
                    break;
                case LedgerEntryType.GATEWAY_FEE:
                    summary.fee += entry.amount;
                    break;
                case LedgerEntryType.TRAINER_COMMISSION:
                    summary.trainerCut += entry.amount;
                    break;
                case LedgerEntryType.VOLUNTEER_COMMISSION:
                    summary.affiliateCut += entry.amount;
                    break;
                case LedgerEntryType.NET_PLATFORM_PROFIT:
                    summary.netProfit += entry.amount;
                    break;
            }
        }

        const transactions = Array.from(orderMap.values()).sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return NextResponse.json({
            success: true,
            data: {
                transactions
            }
        });

    } catch (error: any) {
        console.error('Admin finance orders API error:', error);
        return NextResponse.json({
            success: false,
            error: { message: error.message || 'Failed to fetch financial data' }
        }, { status: 500 });
    }
}
