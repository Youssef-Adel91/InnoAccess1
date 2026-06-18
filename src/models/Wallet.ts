import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Wallet Document Interface
 *
 * One Wallet document per volunteer. Acts as a running balance ledger.
 *
 * Balance rules:
 *   pendingBalance   — commissions locked for the 14-day anti-refund hold.
 *                      Incremented when a Commission is created.
 *                      Decremented when a Commission transitions pending→available.
 *
 *   availableBalance — unlocked commissions ready to withdraw.
 *                      Incremented when pending→available transition occurs.
 *                      Decremented when a Payout is requested (and those
 *                      commissions are marked 'paid').
 *
 *   totalEarned      — lifetime cumulative. Only ever increases.
 *                      Incremented together with pendingBalance on each new
 *                      Commission. Used for the volunteer's "all-time" stat.
 *
 *   totalPaidOut     — lifetime withdrawn. Only ever increases.
 *                      Incremented when a Payout is marked as paid by admin.
 *
 * All balance fields are in EGP (whole units, matching Order.amount).
 *
 * IMPORTANT: Never update balances with read-modify-write (find → calculate → save).
 * Always use MongoDB's atomic $inc operator to prevent race conditions when
 * multiple sales or payouts happen concurrently.
 */
export interface IWallet extends Document {
    volunteerId:      Types.ObjectId;
    pendingBalance:   number;
    availableBalance: number;
    totalEarned:      number;
    totalPaidOut:     number;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const WalletSchema = new Schema<IWallet>(
    {
        volunteerId: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Volunteer ID is required'],
            unique:   true, // 1-to-1 relationship — one wallet per volunteer
        },
        pendingBalance: {
            type:    Number,
            default: 0,
            min:     [0, 'Pending balance cannot be negative'],
        },
        availableBalance: {
            type:    Number,
            default: 0,
            min:     [0, 'Available balance cannot be negative'],
        },
        totalEarned: {
            type:    Number,
            default: 0,
            min:     [0, 'Total earned cannot be negative'],
        },
        totalPaidOut: {
            type:    Number,
            default: 0,
            min:     [0, 'Total paid out cannot be negative'],
        },
    },
    {
        timestamps: true,
    }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Primary lookup — one wallet per volunteer (unique already creates an index,
// but we re-declare it explicitly for documentation clarity)
WalletSchema.index({ volunteerId: 1 }, { unique: true });

// ─── Model ─────────────────────────────────────────────────────────────────────

const Wallet: Model<IWallet> =
    mongoose.models.Wallet ||
    mongoose.model<IWallet>('Wallet', WalletSchema);

export default Wallet;
