import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Expense — admin-logged operating costs
 *
 * Used by the Admin Finance Dashboard to track platform operating expenses
 * (servers, marketing, salaries, tools, etc.) for accurate P&L reporting.
 *
 * Each Expense also creates a corresponding MANUAL_EXPENSE LedgerEntry
 * so it is included in the unified financial audit trail and deducted
 * from the platform's net profit calculation.
 *
 * ── P&L formula ───────────────────────────────────────────────────────────────
 *   Net Platform Profit = Σ NET_PLATFORM_PROFIT ledger entries
 *                        − Σ all Expense.amount values
 */

export const ExpenseCategory = {
    SERVERS:   'SERVERS',
    MARKETING: 'MARKETING',
    SALARIES:  'SALARIES',
    TOOLS:     'TOOLS',
    OTHER:     'OTHER',
} as const;

export type ExpenseCategory = typeof ExpenseCategory[keyof typeof ExpenseCategory];

export interface IExpense extends Document {
    /** Amount in EGP (whole units) */
    amount: number;

    /** Broad category for P&L grouping */
    category: ExpenseCategory;

    /**
     * Required human-readable description.
     * e.g. "Vercel Pro plan - June 2025" or "Facebook Ads - Q2 campaign"
     */
    description: string;

    /**
     * The date this expense was incurred (not necessarily today).
     * Allows backdating for accurate monthly P&L.
     */
    date: Date;

    /** Admin who logged this expense */
    addedBy: Types.ObjectId;

    /**
     * Reference to the corresponding LedgerEntry (MANUAL_EXPENSE type).
     * Set immediately after LedgerEntry creation for cross-reference.
     */
    ledgerEntryId?: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const ExpenseSchema = new Schema<IExpense>(
    {
        amount: {
            type:     Number,
            required: [true, 'Expense amount is required'],
            min:      [1, 'Expense must be at least EGP 1'],
        },
        category: {
            type:     String,
            enum:     Object.values(ExpenseCategory),
            required: [true, 'Expense category is required'],
        },
        description: {
            type:      String,
            required:  [true, 'Expense description is required'],
            trim:      true,
            minlength: [3,   'Description must be at least 3 characters'],
            maxlength: [300, 'Description cannot exceed 300 characters'],
        },
        date: {
            type:    Date,
            default: () => new Date(),
        },
        addedBy: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Admin user ID is required'],
        },
        ledgerEntryId: {
            type: Schema.Types.ObjectId,
            ref:  'LedgerEntry',
        },
    },
    {
        timestamps: true,
    }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Finance dashboard — sort expenses by date descending (most recent first)
ExpenseSchema.index({ date: -1 });

// Monthly P&L report — aggregate by category within a date range
ExpenseSchema.index({ category: 1, date: -1 });

// Admin audit — who added what expenses
ExpenseSchema.index({ addedBy: 1, createdAt: -1 });

// ─── Model ─────────────────────────────────────────────────────────────────────

const Expense: Model<IExpense> =
    mongoose.models.Expense ||
    mongoose.model<IExpense>('Expense', ExpenseSchema);

export default Expense;
