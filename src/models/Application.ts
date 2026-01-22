import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Application Status Enum
 */
export enum ApplicationStatus {
    PENDING = 'pending',
    VIEWED = 'viewed',
    SHORTLISTED = 'shortlisted',
    REJECTED = 'rejected',
    ACCEPTED = 'accepted',
}

/**
 * Application Document Interface
 */
export interface IApplication extends Document {
    jobId: Types.ObjectId;
    userId: Types.ObjectId;
    cvUrl: string; // Cloudinary URL
    coverLetter?: string;
    status: ApplicationStatus;
    rejectionReason?: string; // Why the application was rejected
    rejectedAt?: Date; // When rejected (for 24-hour cooldown)
    appliedAt: Date;
    updatedAt: Date;
}

/**
 * Application Schema
 */
const ApplicationSchema = new Schema<IApplication>(
    {
        jobId: {
            type: Schema.Types.ObjectId,
            ref: 'Job',
            required: [true, 'Job ID is required'],
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
        },
        cvUrl: {
            type: String,
            required: [true, 'CV is required'],
        },
        coverLetter: {
            type: String,
            maxlength: [2000, 'Cover letter cannot exceed 2000 characters'],
        },
        status: {
            type: String,
            enum: Object.values(ApplicationStatus),
            default: ApplicationStatus.PENDING,
        },
        rejectionReason: {
            type: String,
            maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
        },
        rejectedAt: {
            type: Date,
        },
        appliedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Index for queries (removed unique constraint to allow reapplication after rejection + 24h)
ApplicationSchema.index({ userId: 1, jobId: 1 });
ApplicationSchema.index({ jobId: 1, status: 1 });
ApplicationSchema.index({ userId: 1 });
ApplicationSchema.index({ appliedAt: -1 });

/**
 * Application Model
 */
const Application: Model<IApplication> =
    mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);

export default Application;
