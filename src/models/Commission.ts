import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Commission Status
 *
 * State machine:
 *   pending   → locked for 14 days post-sale (anti-refund hold)
 *   available → unlocked; can be included in a Payout request
 *   paid      → included in a completed, admin-approved Payout
 */
export enum CommissionStatus {
    PENDING   = 'pending',
    AVAILABLE = 'available',
    PAID      = 'paid',
}

/**
 * Commission Document Interface
 *
 * One Commission document is created per confirmed paid enrollment.
 * It is an immutable audit record — once created, only `status` and
 * `payoutId` are ever updated.
 */
export interface ICommission extends Document {
    /** The volunteer who owns this commission */
    volunteerId: Types.ObjectId;

    /** The user who made the purchase */
    buyerId: Types.ObjectId;

    /** The course that was purchased */
    courseId: Types.ObjectId;

    /**
     * The Order that triggered this commission.
     * Unique index here enforces idempotency — one commission per order, ever.
     */
    orderId: Types.ObjectId;

    /** Snapshot of the affiliate code at time of sale */
    affiliateCode: string;

    /** Full sale amount in EGP (same unit as Order.amount) */
    saleAmount: number;

    /** Rate captured at time of commission (allows future rate changes) */
    commissionRate: number;

    /** Computed: saleAmount × commissionRate, rounded to nearest EGP */
    commissionAmount: number;

    status: CommissionStatus;

    /**
     * When this commission becomes withdrawable.
     * Set to createdAt + 14 days to guard against refund fraud.
     */
    unlocksAt: Date;

    /**
     * Set when this commission is included in a Payout.
     * Sparse — null for pending/available commissions.
     */
    payoutId?: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const CommissionSchema = new Schema<ICommission>(
    {
        volunteerId: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Volunteer ID is required'],
        },
        buyerId: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Buyer ID is required'],
        },
        courseId: {
            type:     Schema.Types.ObjectId,
            ref:      'Course',
            required: [true, 'Course ID is required'],
        },
        orderId: {
            type:     Schema.Types.ObjectId,
            ref:      'Order',
            required: [true, 'Order ID is required'],
            // unique index defined below — enforces one commission per order
        },
        affiliateCode: {
            type:      String,
            required:  [true, 'Affiliate code is required'],
            uppercase: true,
            trim:      true,
        },
        saleAmount: {
            type:     Number,
            required: [true, 'Sale amount is required'],
            min:      [1, 'Sale amount must be positive'],
        },
        commissionRate: {
            type:     Number,
            required: [true, 'Commission rate is required'],
            min:      0,
            max:      1,
        },
        commissionAmount: {
            type:     Number,
            required: [true, 'Commission amount is required'],
            min:      [0, 'Commission amount cannot be negative'],
        },
        status: {
            type:    String,
            enum:    Object.values(CommissionStatus),
            default: CommissionStatus.PENDING,
        },
        unlocksAt: {
            type:     Date,
            required: [true, 'Unlock date is required'],
        },
        payoutId: {
            type:   Schema.Types.ObjectId,
            ref:    'Payout',
            // sparse: defined in index below
        },
    },
    {
        timestamps: true,
    }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Primary idempotency guard — one commission per Order, guaranteed at DB level
CommissionSchema.index({ orderId: 1 }, { unique: true });

// Volunteer dashboard queries — "show me all my commissions, filtered by status"
CommissionSchema.index({ volunteerId: 1, status: 1 });

// Lazy unlock cron (optional future use) — find all pending commissions past unlock date
CommissionSchema.index({ status: 1, unlocksAt: 1 });

// Payout lookup — "which commissions belong to payout X?"
CommissionSchema.index({ payoutId: 1 }, { sparse: true });

// ─── Model ─────────────────────────────────────────────────────────────────────

const Commission: Model<ICommission> =
    mongoose.models.Commission ||
    mongoose.model<ICommission>('Commission', CommissionSchema);

export default Commission;
