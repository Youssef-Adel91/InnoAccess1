import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import LedgerEntry, { LedgerEntryType } from '@/models/LedgerEntry';
import Wallet from '@/models/Wallet';
import Expense from '@/models/Expense';

/**
 * GET /api/admin/finance/summary
 *
 * Returns platform-wide financial KPIs aggregated from LedgerEntry and Expense
 * collections. Used by the Overview tab of the Finance Dashboard.
 *
 * Response shape:
 * {
 *   totalGrossRevenue:    number  — Σ GROSS_REVENUE entries (EGP)
 *   totalPlatformProfit: number  — Σ NET_PLATFORM_PROFIT entries (EGP)
 *   totalPendingPayouts: number  — Σ availableBalance across all Wallets (EGP)
 *   totalExpenses:       number  — Σ all Expense.amount values (EGP)
 *   netProfit:           number  — totalPlatformProfit − totalExpenses
 *   revenueByMonth:      Array<{ month: string; gross: number; profit: number }>
 * }
 *
 * Auth: Admin only.
 */
export async function GET(_req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        await connectDB();

        // ── Parallel aggregations ─────────────────────────────────────────────
        const [ledgerAgg, walletAgg, expenseAgg, monthlyAgg] = await Promise.all([

            // Sum of key ledger entry types
            LedgerEntry.aggregate([
                {
                    $group: {
                        _id:    '$entryType',
                        total:  { $sum: '$amount' },
                    },
                },
            ]),

            // Sum of all available balances (platform liabilities)
            Wallet.aggregate([
                {
                    $group: {
                        _id:             null,
                        totalAvailable:  { $sum: '$availableBalance' },
                        trainerPending:  { $sum: { $cond: [{ $eq: ['$userType', 'trainer']   }, '$availableBalance', 0] } },
                        volunteerPending:{ $sum: { $cond: [{ $eq: ['$userType', 'volunteer'] }, '$availableBalance', 0] } },
                    },
                },
            ]),

            // Sum of all expenses
            Expense.aggregate([
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]),

            // Revenue by month — last 12 months
            LedgerEntry.aggregate([
                {
                    $match: {
                        entryType: { $in: [LedgerEntryType.GROSS_REVENUE, LedgerEntryType.NET_PLATFORM_PROFIT] },
                        createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
                    },
                },
                {
                    $group: {
                        _id: {
                            year:  { $year:  '$createdAt' },
                            month: { $month: '$createdAt' },
                            type:  '$entryType',
                        },
                        total: { $sum: '$amount' },
                    },
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
            ]),
        ]);

        // ── Build totals map ──────────────────────────────────────────────────
        const totalsMap = Object.fromEntries(
            ledgerAgg.map(({ _id, total }: { _id: string; total: number }) => [_id, total])
        );

        const totalGrossRevenue    = totalsMap[LedgerEntryType.GROSS_REVENUE]       ?? 0;
        const totalPlatformProfit  = totalsMap[LedgerEntryType.NET_PLATFORM_PROFIT] ?? 0;
        const totalPendingPayouts  = walletAgg[0]?.totalAvailable ?? 0;
        const trainerPending       = walletAgg[0]?.trainerPending  ?? 0;
        const volunteerPending     = walletAgg[0]?.volunteerPending ?? 0;
        const totalExpenses        = expenseAgg[0]?.total ?? 0;
        const netProfit            = totalPlatformProfit - totalExpenses;

        // ── Monthly series for the sparkline chart ────────────────────────────
        // Flatten the { year, month, type } groups into { month: "YYYY-MM", gross, profit }
        const monthlyMap = new Map<string, { gross: number; profit: number }>();
        for (const row of monthlyAgg) {
            const key    = `${row._id.year}-${String(row._id.month).padStart(2, '0')}`;
            const entry  = monthlyMap.get(key) ?? { gross: 0, profit: 0 };
            if (row._id.type === LedgerEntryType.GROSS_REVENUE)      entry.gross  = row.total;
            if (row._id.type === LedgerEntryType.NET_PLATFORM_PROFIT) entry.profit = row.total;
            monthlyMap.set(key, entry);
        }

        const revenueByMonth = Array.from(monthlyMap.entries())
            .map(([month, vals]) => ({ month, ...vals }))
            .sort((a, b) => a.month.localeCompare(b.month));

        return NextResponse.json({
            success: true,
            data: {
                totalGrossRevenue,
                totalPlatformProfit,
                totalPendingPayouts,
                trainerPending,
                volunteerPending,
                totalExpenses,
                netProfit,
                revenueByMonth,
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Finance summary error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'FINANCE_SUMMARY_ERROR' } },
            { status: 500 }
        );
    }
}
