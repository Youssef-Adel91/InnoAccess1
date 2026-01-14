import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Last Watched Position Interface
 */
export interface ILastWatched {
    moduleIndex: number;
    videoIndex: number;
    timestamp: number; // in seconds
}

/**
 * Enrollment Document Interface
 */
export interface IEnrollment extends Document {
    courseId: Types.ObjectId;
    userId: Types.ObjectId;
    progress: string[]; // Array of completed video IDs
    lastWatched: ILastWatched;
    paymentId: string; // Paymob order ID
    isPaymentProcessed: boolean; // Idempotency flag
    completedAt?: Date;
    enrolledAt: Date;
    updatedAt: Date;
}

/**
 * Last Watched Schema
 */
const LastWatchedSchema = new Schema<ILastWatched>({
    moduleIndex: {
        type: Number,
        required: true,
        default: 0,
    },
    videoIndex: {
        type: Number,
        required: true,
        default: 0,
    },
    timestamp: {
        type: Number,
        required: true,
        default: 0,
    },
});

/**
 * Enrollment Schema
 */
const EnrollmentSchema = new Schema<IEnrollment>(
    {
        courseId: {
            type: Schema.Types.ObjectId,
            ref: 'Course',
            required: [true, 'Course ID is required'],
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
        },
        progress: {
            type: [String],
            default: [],
        },
        lastWatched: {
            type: LastWatchedSchema,
            default: {},
        },
        paymentId: {
            type: String,
            required: [true, 'Payment ID is required'],
        },
        isPaymentProcessed: {
            type: Boolean,
            default: false,
            required: true,
        },
        completedAt: Date,
        enrolledAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to prevent duplicate enrollments
EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
EnrollmentSchema.index({ courseId: 1 });
EnrollmentSchema.index({ userId: 1 });
EnrollmentSchema.index({ enrolledAt: -1 });

/**
 * Enrollment Model
 */
const Enrollment: Model<IEnrollment> =
    mongoose.models.Enrollment || mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);

export default Enrollment;
