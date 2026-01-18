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

/**
 * Order Model
 * Force delete cached model to ensure proper registration
 */
if (mongoose.models.Order) {
    delete mongoose.models.Order;
}

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
