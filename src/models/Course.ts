import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Video Interface
 */
export interface IVideo {
    title: string;
    url: string; // Cloudinary URL
    transcript: string; // Required for accessibility
    duration: number; // in seconds
    order: number;
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
    category: string;
    trainerId: Types.ObjectId;
    price: number; // in cents
    thumbnail?: string; // Cloudinary URL
    modules: IModule[];
    enrollmentCount: number;
    rating: number;
    isPublished: boolean;
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
    url: {
        type: String,
        required: [true, 'Video URL is required'],
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
});

/**
 * Module Schema
 */
const ModuleSchema = new Schema<IModule>({
    title: {
        type: String,
        required: [true, 'Module title is required'],
    },
    description: String,
    videos: {
        type: [VideoSchema],
        required: true,
        validate: {
            validator: function (v: IVideo[]) {
                return v && v.length > 0;
            },
            message: 'Each module must have at least one video',
        },
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
            minlength: [50, 'Description must be at least 50 characters'],
            maxlength: [3000, 'Description cannot exceed 3000 characters'],
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
        },
        trainerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Trainer ID is required'],
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
        thumbnail: String,
        modules: {
            type: [ModuleSchema],
            required: true,
            validate: {
                validator: function (v: IModule[]) {
                    return v && v.length > 0;
                },
                message: 'Course must have at least one module',
            },
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
