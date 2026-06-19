import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import { CourseType, ILiveSession } from '@/types/course';
import { UserRole } from '@/models/User';
import { sanitizeHtml } from '@/lib/sanitize-html';

/**
 * Video Type Enum
 * Determines where the video is hosted
 */
export enum VideoType {
    UPLOAD = 'upload',   // Hosted on Bunny.net via direct upload
    YOUTUBE = 'youtube', // Embedded from YouTube via URL
}

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
    videoType: VideoType;        // NEW: source of the video
    bunnyVideoId?: string;       // Bunny.net video ID (only for UPLOAD type)
    url?: string;                // Generated Bunny CDN URL (optional, computed from bunnyVideoId)
    youtubeUrl?: string;         // Full YouTube URL (only for YOUTUBE type)
    transcript: string;          // Required for accessibility (WCAG)
    duration: number;            // in seconds (0 for YouTube videos, set manually)
    order: number;
    status: VideoStatus;         // Approval status
    rejectionReason?: string;    // Admin feedback if rejected
    uploadedBy: Types.ObjectId;  // Trainer who uploaded
    uploadedAt: Date;
    isFreePreview: boolean;      // Can non-enrolled students watch this? (for paid courses)
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
    originalPrice?: number; // Original price before discount (in cents)
    /**
     * Fraction of the NET sale amount (after gateway fees) paid to the trainer.
     * e.g. 0.40 = 40% to trainer, 0.60 retained by platform before volunteer commission.
     * Defaults to 0.40 if not set by admin. Range: 0–1.
     */
    trainerCommissionRate: number;
    thumbnail?: string; // Cloudinary URL
    courseType: CourseType; // NEW: RECORDED or LIVE
    liveSession?: ILiveSession; // NEW: Live Zoom session details
    modules: IModule[];
    enrollmentCount: number;
    rating: number;
    allowedRoles: string[];
    isPublished: boolean;
    isDeleted: boolean; // Soft delete flag
    deletedAt?: Date; // Soft delete timestamp
    lastReminderSent?: Date; // Timestamp of last workshop reminder email sent
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
    // Discriminator: tells us where the video is hosted
    videoType: {
        type: String,
        enum: Object.values(VideoType),
        default: VideoType.UPLOAD,
        required: true,
    },
    // Only required when videoType === 'upload'
    bunnyVideoId: {
        type: String,
        required: false,
        default: '',
    },
    url: {
        type: String,
    },
    // Only required when videoType === 'youtube'
    youtubeUrl: {
        type: String,
        required: false,
    },
    transcript: {
        type: String,
        required: [true, 'Video transcript is required for accessibility'],
    },
    duration: {
        type: Number,
        required: [true, 'Video duration is required'],
        default: 0,
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
        originalPrice: {
            type: Number,
            min: [0, 'Original price cannot be negative'],
        },
        trainerCommissionRate: {
            type:    Number,
            default: 0.40,
            min:     [0,    'Trainer commission rate cannot be negative'],
            max:     [1,    'Trainer commission rate cannot exceed 100%'],
            // Admin-configurable per course. Stored as a decimal fraction.
            // Default 0.40 means the trainer earns 40% of the net sale amount.
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
        allowedRoles: {
            type: [String],
            enum: Object.values(UserRole),
            default: [UserRole.USER, UserRole.COMPANY, UserRole.TRAINER, UserRole.ADMIN, UserRole.VOLUNTEER],
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
        courseType: {
            type: String,
            enum: Object.values(CourseType),
            default: CourseType.RECORDED,
            required: true,
        },
        liveSession: {
            startDate: {
                type: Date,
                required: function (this: ICourse) {
                    return this.courseType === CourseType.LIVE;
                },
            },
            durationMinutes: {
                type: Number,
                min: [15, 'Duration must be at least 15 minutes'],
                max: [480, 'Duration cannot exceed 8 hours (480 minutes)'],
                required: function (this: ICourse) {
                    return this.courseType === CourseType.LIVE;
                },
            },
            zoomMeetingLink: {
                type: String,
                match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
                required: function (this: ICourse) {
                    return this.courseType === CourseType.LIVE;
                },
            },
            zoomRecordingLink: {
                type: String,
                match: [/^https?:\/\/.+/, 'Please enter a valid URL'],
            },
            instructions: String,
            isRecordingAvailable: {
                type: Boolean,
                default: false,
            },
        },
        lastReminderSent: {
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

CourseSchema.pre('save', function (next) {
    if (this.isModified('description') && this.description) {
        this.description = sanitizeHtml(this.description);
    }

    if (this.isModified('modules') && this.modules && this.modules.length > 0) {
        this.modules.forEach(module => {
            if (module.description) {
                module.description = sanitizeHtml(module.description);
            }
        });
    }

    next();
});

/**
 * Course Model
 */
const Course: Model<ICourse> = mongoose.models.Course || mongoose.model<ICourse>('Course', CourseSchema);

export default Course;
