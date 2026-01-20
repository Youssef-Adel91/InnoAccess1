import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Trainer Application Status Enum
 */
export enum TrainerStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

/**
 * Trainer Profile Document Interface
 */
export interface ITrainerProfile extends Document {
    userId: Types.ObjectId; // 1-to-1 relationship with User
    bio: string;
    linkedInUrl?: string;
    websiteUrl?: string;
    cvUrl: string; // Vercel Blob URL
    specialization: string;
    status: TrainerStatus;
    rejectionReason?: string;
    rejectedAt?: Date; // When the application was rejected (for 24h cooldown)
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Trainer Profile Schema
 */
const TrainerProfileSchema = new Schema<ITrainerProfile>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
            unique: true, // Ensures 1-to-1 relationship
        },
        bio: {
            type: String,
            required: [true, 'Bio is required'],
            minlength: [50, 'Bio must be at least 50 characters'],
            maxlength: [2000, 'Bio cannot exceed 2000 characters'],
        },
        linkedInUrl: {
            type: String,
            match: [
                /^https?:\/\/(www\.)?linkedin\.com\/(in|company|school)\/.+$/i,
                'Please enter a valid LinkedIn URL',
            ],
        },
        websiteUrl: {
            type: String,
            match: [
                /^https?:\/\/.+/,
                'Please enter a valid URL',
            ],
        },
        cvUrl: {
            type: String,
            required: [true, 'CV is required'],
        },
        specialization: {
            type: String,
            required: [true, 'Specialization is required'],
            trim: true,
        },
        status: {
            type: String,
            enum: Object.values(TrainerStatus),
            default: TrainerStatus.PENDING,
        },
        rejectionReason: {
            type: String,
            maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
        },
        rejectedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
TrainerProfileSchema.index({ userId: 1 }, { unique: true });
TrainerProfileSchema.index({ status: 1 });
TrainerProfileSchema.index({ createdAt: -1 });

/**
 * Trainer Profile Model
 */
const TrainerProfile: Model<ITrainerProfile> =
    mongoose.models.TrainerProfile ||
    mongoose.model<ITrainerProfile>('TrainerProfile', TrainerProfileSchema);

export default TrainerProfile;
