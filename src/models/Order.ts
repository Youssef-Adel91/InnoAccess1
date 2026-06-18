import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Order Status Enum
 */
export enum OrderStatus {
    PENDING = 'PENDING',
    COMPLETED = 'COMPLETED',
    REJECTED = 'REJECTED',
}

/**
 * Payment Method Enum
 */
export enum PaymentMethod {
    PAYMOB = 'PAYMOB',
    MANUAL = 'MANUAL',
}

/**
 * Order Document Interface
 */
export interface IOrder extends Document {
    userId: Types.ObjectId;
    courseId: Types.ObjectId;
    amount: number;
    currency: string;
    status: OrderStatus;
    paymentMethod: PaymentMethod;

    // Paymob specific fields
    paymobOrderId?: string;
    paymobTransactionId?: string;

    // Manual payment specific fields
    receiptUrl?: string;
    manualTransferNumber?: string;

    // Admin review
    rejectionReason?: string;
    reviewedBy?: Types.ObjectId;
    reviewedAt?: Date;

    /**
     * Affiliate referral code captured from the `innoaccess_ref` cookie
     * at the moment the checkout is initiated.
     *
     * WHY here and not in Enrollment or Commission:
     *   The Paymob webhook is a server-to-server call — there is no browser
     *   cookie on that request. By saving the cookie value onto the Order at
     *   checkout initiation (when the browser IS present), the webhook can
     *   retrieve it from this field without needing a cookie.
     *
     * Null for orders that did not originate from an affiliate link.
     */
    affiliateRef?: string;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Order Schema
 */
const OrderSchema = new Schema<IOrder>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            index: true,
        },
        courseId: {
            type: Schema.Types.ObjectId,
            ref: 'Course',
            required: [true, 'Course ID is required'],
            index: true,
        },
        amount: {
            type: Number,
            required: [true, 'Amount is required'],
            min: [0, 'Amount must be positive'],
        },
        currency: {
            type: String,
            default: 'EGP',
            uppercase: true,
        },
        status: {
            type: String,
            enum: Object.values(OrderStatus),
            default: OrderStatus.PENDING,
            index: true,
        },
        paymentMethod: {
            type: String,
            enum: Object.values(PaymentMethod),
            required: [true, 'Payment method is required'],
        },

        // Paymob fields
        paymobOrderId: {
            type: String,
            sparse: true, // Allows null but creates index for non-null values
        },
        paymobTransactionId: {
            type: String,
            sparse: true,
        },

        // Manual payment fields
        receiptUrl: {
            type: String,
        },
        manualTransferNumber: {
            type: String,
        },

        // Admin review fields
        rejectionReason: {
            type: String,
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewedAt: {
            type: Date,
        },

        // Affiliate referral code — captured from browser cookie at checkout initiation
        affiliateRef: {
            type:      String,
            uppercase: true,
            trim:      true,
            match:     [/^VOL_[A-Z0-9]{6}$/, 'Invalid affiliate code format'],
            // sparse: true via index below — most orders will not have a ref code
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
OrderSchema.index({ userId: 1, courseId: 1 });
OrderSchema.index({ status: 1, paymentMethod: 1 });
OrderSchema.index({ paymobOrderId: 1 }, { sparse: true });
OrderSchema.index({ createdAt: -1 });
// Sparse index — only indexes orders that have an affiliate referral
OrderSchema.index({ affiliateRef: 1 }, { sparse: true });

/**
 * Order Model
 * Force delete cached model to ensure proper registration
 */
if (mongoose.models.Order) {
    delete mongoose.models.Order;
}

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
