import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Payout Method
 */
export enum PayoutMethod {
    VODAFONE_CASH = 'vodafone_cash',
    INSTAPAY      = 'instapay',
}

/**
 * Payout Status
 *
 * State machine:
 *   pending  → submitted by volunteer, awaiting admin review
 *   approved → admin has verified; physical transfer is next
 *   paid     → admin has sent the money and marked it done
 *   rejected → admin rejected with a note
 *
 * Note: a rejected payout returns the commissions to 'available' status
 * so the volunteer can request again. This logic lives in the API route.
 */
export enum PayoutStatus {
    PENDING  = 'pending',
    APPROVED = 'approved',
    PAID     = 'paid',
    REJECTED = 'rejected',
}

/**
 * Payout Document Interface
 *
 * Represents a single withdrawal request from a volunteer.
 * The `commissionIds` array links to every Commission document
 * included in this payout, providing a complete audit trail.
 *
 * Account number is stored here (ephemeral — per-request basis).
 * It is NOT stored on the User profile for privacy reasons.
 */
export interface IPayout extends Document {
    volunteerId:   Types.ObjectId;

    /** Requested withdrawal amount in EGP */
    amount: number;

    method:        PayoutMethod;

    /**
     * Phone number / InstaPay ID entered by the volunteer at request time.
     * Ephemeral — not saved to the User profile.
     */
    accountNumber: string;

    status: PayoutStatus;

    /** Optional note from admin (required when status = 'rejected') */
    adminNote?: string;

    /** Admin who processed this payout request */
    processedBy?: Types.ObjectId;

    /** Timestamp of admin action */
    processedAt?: Date;

    /**
     * The Commission documents included in this payout.
     * These are marked Commission.status = 'paid' atomically with Payout creation.
     */
    commissionIds: Types.ObjectId[];

    createdAt: Date;
    updatedAt: Date;
}

// ─── Schema ────────────────────────────────────────────────────────────────────

const PayoutSchema = new Schema<IPayout>(
    {
        volunteerId: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Volunteer ID is required'],
        },
        amount: {
            type:     Number,
            required: [true, 'Amount is required'],
            min:      [1, 'Payout amount must be at least EGP 1'],
        },
        method: {
            type:     String,
            enum:     Object.values(PayoutMethod),
            required: [true, 'Payout method is required'],
        },
        accountNumber: {
            type:      String,
            required:  [true, 'Account number is required'],
            trim:      true,
            minlength: [6,  'Account number is too short'],
            maxlength: [30, 'Account number is too long'],
        },
        status: {
            type:    String,
            enum:    Object.values(PayoutStatus),
            default: PayoutStatus.PENDING,
        },
        adminNote: {
            type:      String,
            maxlength: [500, 'Admin note cannot exceed 500 characters'],
        },
        processedBy: {
            type: Schema.Types.ObjectId,
            ref:  'User',
        },
        processedAt: {
            type: Date,
        },
        commissionIds: {
            type:     [Schema.Types.ObjectId],
            ref:      'Commission',
            default:  [],
        },
    },
    {
        timestamps: true,
    }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────

// Volunteer's own payout history + active request check
PayoutSchema.index({ volunteerId: 1, status: 1 });

// Admin queue — show all pending requests, newest first
PayoutSchema.index({ status: 1, createdAt: -1 });

// ─── Model ─────────────────────────────────────────────────────────────────────

const Payout: Model<IPayout> =
    mongoose.models.Payout ||
    mongoose.model<IPayout>('Payout', PayoutSchema);

export default Payout;
