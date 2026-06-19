import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Wallet — unified for both Trainers and Volunteers
 *
 * ── Design: Single model, user-type discriminator ─────────────────────────────
 * We deliberately use one Wallet model for both user types.
 * Rationale:
 *   - Unified payout queue in the admin finance dashboard
 *   - Identical balance mechanics (availableBalance, totalPaidOut)
 *   - One $inc call pattern across the whole codebase
 *
 * ── Balance definitions ───────────────────────────────────────────────────────
 *   pendingBalance   — earnings locked during anti-refund hold period.
 *                      Volunteers: 14-day hold on affiliate commissions.
 *                      Trainers:   0-day hold (admin manually approves all orders
 *                                  before revenue is split, so hold is not needed).
 *
 *   availableBalance — unlocked earnings ready for payout.
 *                      Incremented by revenueSplitEngine on each approved order.
 *                      Decremented when admin "settles" via the finance dashboard.
 *
 *   totalEarned      — lifetime cumulative. Only ever increases.
 *
 *   totalPaidOut     — lifetime withdrawn. Only ever increases.
 *
 * All amounts are in EGP whole units.
 *
 * ── Concurrency safety ────────────────────────────────────────────────────────
 * NEVER use read-modify-write. Always use MongoDB's atomic $inc operator
 * to prevent race conditions when multiple sales are processed concurrently.
 */

export type WalletUserType = 'trainer' | 'volunteer';

export interface IWallet extends Document {
    /** The user who owns this wallet (trainer or volunteer) */
    userId:           Types.ObjectId;

    /** Discriminator: which role this wallet belongs to */
    userType:         WalletUserType;

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
        userId: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'User ID is required'],
        },
        userType: {
            type:     String,
            enum:     ['trainer', 'volunteer'] satisfies WalletUserType[],
            required: [true, 'User type is required'],
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

// Primary lookup — one wallet per user per type (trainer + volunteer both supported)
// Unique compound index: a trainer can have one wallet, a volunteer can have one wallet
WalletSchema.index({ userId: 1, userType: 1 }, { unique: true });

// Finance dashboard query — find all wallets with outstanding balances
WalletSchema.index({ availableBalance: 1, userType: 1 });

// ── Backward-compatibility virtual ────────────────────────────────────────────
// Volunteer code still reads wallet.volunteerId in some places.
// This virtual keeps those reads working without a data migration.
WalletSchema.virtual('volunteerId').get(function (this: IWallet) {
    return this.userId;
});

// ─── Model ─────────────────────────────────────────────────────────────────────

// Force model re-registration to pick up schema changes in dev hot-reload
if (mongoose.models.Wallet) {
    delete mongoose.models.Wallet;
}

const Wallet: Model<IWallet> = mongoose.model<IWallet>('Wallet', WalletSchema);

export default Wallet;
