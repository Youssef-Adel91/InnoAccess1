import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Expense, { ExpenseCategory } from '@/models/Expense';
import LedgerEntry, { LedgerEntryType } from '@/models/LedgerEntry';
import { Types } from 'mongoose';

// ─── GET /api/admin/finance/expenses ──────────────────────────────────────────

/**
 * GET /api/admin/finance/expenses
 *
 * Returns paginated list of operating expenses, newest first.
 * Includes per-category totals for the Expenses tab header.
 *
 * Query params:
 *   ?category=SERVERS|MARKETING|SALARIES|TOOLS|OTHER  (optional)
 *   ?page=1
 *   ?limit=20
 *
 * Auth: Admin only.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const categoryFilter = searchParams.get('category');
        const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
        const skip  = (page - 1) * limit;

        const matchStage: Record<string, unknown> = {};
        if (categoryFilter && Object.values(ExpenseCategory).includes(categoryFilter as ExpenseCategory)) {
            matchStage.category = categoryFilter;
        }

        const [expenses, total, categoryTotals] = await Promise.all([
            Expense.aggregate([
                { $match: matchStage },
                { $sort:  { date: -1 } },
                { $skip:  skip },
                { $limit: limit },

                // Join admin who added it
                {
                    $lookup: {
                        from:         'users',
                        localField:   'addedBy',
                        foreignField: '_id',
                        as:           'addedByUser',
                        pipeline: [{ $project: { name: 1, email: 1 } }],
                    },
                },
                { $unwind: { path: '$addedByUser', preserveNullAndEmptyArrays: true } },

                {
                    $project: {
                        _id:         1,
                        amount:      1,
                        category:    1,
                        description: 1,
                        date:        1,
                        createdAt:   1,
                        addedBy: {
                            name:  '$addedByUser.name',
                            email: '$addedByUser.email',
                        },
                    },
                },
            ]),

            Expense.countDocuments(matchStage),

            // Per-category totals (always over all categories, not filtered)
            Expense.aggregate<{ _id: string; total: number; count: number }>([
                { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
                { $sort:  { total: -1 } },
            ]),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                expenses,
                categoryTotals: categoryTotals.map(({ _id, total, count }: { _id: string; total: number; count: number }) => ({
                    category: _id,
                    total,
                    count,
                })),
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Finance expenses list error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'EXPENSES_LIST_ERROR' } },
            { status: 500 }
        );
    }
}

// ─── POST /api/admin/finance/expenses ─────────────────────────────────────────

/**
 * POST /api/admin/finance/expenses
 *
 * Logs a new operating expense AND creates a corresponding MANUAL_EXPENSE
 * LedgerEntry so the expense appears in the financial audit trail and
 * reduces the platform's net profit in the summary API.
 *
 * Body: { amount: number; category: string; description: string; date?: string }
 *
 * Auth: Admin only.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        await connectDB();

        const body = await req.json() as {
            amount?:      unknown;
            category?:    unknown;
            description?: unknown;
            date?:        unknown;
        };

        const { amount, category, description, date } = body;

        // ── Input validation ──────────────────────────────────────────────────
        if (typeof amount !== 'number' || amount < 1) {
            return NextResponse.json(
                { success: false, error: { message: 'Amount must be a positive number', code: 'INVALID_AMOUNT' } },
                { status: 400 }
            );
        }

        if (!category || !Object.values(ExpenseCategory).includes(category as ExpenseCategory)) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: `Category must be one of: ${Object.values(ExpenseCategory).join(', ')}`,
                        code: 'INVALID_CATEGORY',
                    },
                },
                { status: 400 }
            );
        }

        if (!description || typeof description !== 'string' || description.trim().length < 3) {
            return NextResponse.json(
                { success: false, error: { message: 'Description must be at least 3 characters', code: 'INVALID_DESCRIPTION' } },
                { status: 400 }
            );
        }

        const expenseDate = date && typeof date === 'string' ? new Date(date) : new Date();
        if (isNaN(expenseDate.getTime())) {
            return NextResponse.json(
                { success: false, error: { message: 'Invalid date format', code: 'INVALID_DATE' } },
                { status: 400 }
            );
        }

        const adminId = new Types.ObjectId(session.user.id);
        const trimmedDescription = (description as string).trim();

        // ── Create LedgerEntry first, then Expense with ledgerEntryId ref ─────
        const [ledgerEntry, expense] = await Promise.all([
            LedgerEntry.create({
                entryType: LedgerEntryType.MANUAL_EXPENSE,
                amount,
                note: `[${category}] ${trimmedDescription}`,
            }),
        ]).then(async ([le]) => {
            const exp = await Expense.create({
                amount,
                category,
                description: trimmedDescription,
                date:         expenseDate,
                addedBy:      adminId,
                ledgerEntryId: le._id,
            });
            return [le, exp];
        });

        console.log(`✅ Expense logged: EGP ${amount} [${category}] "${trimmedDescription}" by admin ${adminId}`);

        return NextResponse.json(
            {
                success: true,
                data: {
                    expense:     expense._id,
                    ledgerEntry: ledgerEntry._id,
                    message:     'Expense logged successfully.',
                },
            },
            { status: 201 }
        );

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Finance expense create error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'EXPENSE_CREATE_ERROR' } },
            { status: 500 }
        );
    }
}
