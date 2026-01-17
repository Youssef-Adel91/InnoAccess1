import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Video Status Enum
 */
export enum VideoStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

/**
 * Video Interface
 */
export interface IVideo {
    title: string;
    bunnyVideoId: string; // Bunny.net video ID
    url?: string; // Generated Bunny CDN URL (optional, computed from bunnyVideoId)
    transcript: string; // Required for accessibility
    duration: number; // in seconds
    order: number;
    status: VideoStatus; // Approval status
    rejectionReason?: string; // Admin feedback if rejected
    uploadedBy: Types.ObjectId; // Trainer who uploaded
    uploadedAt: Date;
    isFreePreview: boolean; // Can non-enrolled students watch this? (for paid courses)
}

/**
 * Module Interface
 */
export interface IModule {
    title: string;
    description?: string;
    videos: IVideo[];
    resources?: string[]; // URLs to downloadable resources
    order: number;
}

/**
 * Course Document Interface
 */
export interface ICourse extends Document {
    title: string;
    description: string;
    categoryId: Types.ObjectId; // Reference to Category
    trainerId: Types.ObjectId;
    isFree: boolean; // Is entire course free?
    price: number; // Required if not free (in cents)
    thumbnail?: string; // Cloudinary URL
    modules: IModule[];
    enrollmentCount: number;
    rating: number;
    isPublished: boolean;
    isDeleted: boolean; // Soft delete flag
    deletedAt?: Date; // Soft delete timestamp
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Video Schema
 */
const VideoSchema = new Schema<IVideo>({
    title: {
        type: String,
        required: [true, 'Video title is required'],
    },
    bunnyVideoId: {
        type: String,
        required: [true, 'Bunny video ID is required'],
    },
    url: {
        type: String,
        // Optional - can be generated from bunnyVideoId + CDN hostname
    },
    transcript: {
        type: String,
        required: [true, 'Video transcript is required for accessibility'],
    },
    duration: {
        type: Number,
        required: [true, 'Video duration is required'],
    },
    order: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: Object.values(VideoStatus),
        default: VideoStatus.PENDING,
    },
    rejectionReason: {
        type: String,
    },
    uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Uploader ID is required'],
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    isFreePreview: {
        type: Boolean,
        default: false,
    },
});

/**
 * Module Schema
 * Note: Modules can be created empty and populated with videos later
 */
const ModuleSchema = new Schema<IModule>({
    title: {
        type: String,
        required: [true, 'Module title is required'],
    },
    description: String,
    videos: {
        type: [VideoSchema],
        default: [],
    },
    resources: [String],
    order: {
        type: Number,
        required: true,
    },
});

/**
 * Course Schema
 */
const CourseSchema = new Schema<ICourse>(
    {
        title: {
            type: String,
            required: [true, 'Course title is required'],
            trim: true,
            minlength: [5, 'Title must be at least 5 characters'],
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            required: [true, 'Course description is required'],
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: 'Category',
            required: [true, 'Category is required'],
        },
        trainerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Trainer ID is required'],
        },
        isFree: {
            type: Boolean,
            default: false,
        },
        price: {
            type: Number,
            required: function (this: ICourse) {
                return !this.isFree;
            },
            min: [0, 'Price cannot be negative'],
            default: 0,
        },
        thumbnail: String,
        modules: {
            type: [ModuleSchema],
            default: [],
        },
        enrollmentCount: {
            type: Number,
            default: 0,
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        isPublished: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
CourseSchema.index({ title: 'text', description: 'text' });
CourseSchema.index({ trainerId: 1 });
CourseSchema.index({ category: 1 });
CourseSchema.index({ isPublished: 1 });
CourseSchema.index({ price: 1 });
CourseSchema.index({ rating: -1 });
CourseSchema.index({ enrollmentCount: -1 });

/**
 * Course Model
 */
const Course: Model<ICourse> = mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);

export default Course;
