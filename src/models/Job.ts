import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Job Type Enum
 */
export enum JobType {
    REMOTE = 'remote',
    ONSITE = 'onsite',
    HYBRID = 'hybrid',
}

/**
 * Job Employment Type Enum
 */
export enum JobEmploymentType {
    FULL_TIME = 'full-time',
    PART_TIME = 'part-time',
    INTERNSHIP = 'internship',
}

/**
 * Job Status Enum
 */
export enum JobStatus {
    PUBLISHED = 'published',
    DRAFT = 'draft',
    ARCHIVED = 'archived',
}

/**
 * Salary Interface
 */
export interface ISalary {
    min: number;
    max: number;
    currency: string;
}

/**
 * Job Document Interface
 */
export interface IJob extends Document {
    title: string;
    description: string;
    requirements: string[];
    companyId: Types.ObjectId;
    salary: ISalary;
    location: string;
    type: JobType;
    jobType: JobEmploymentType;
    contactEmail: string;
    contactPhone?: string;
    companyLogo?: string; // Cloudinary URL for job-specific image
    accessibilityFeatures: string[];
    applicants: Types.ObjectId[];
    status: JobStatus;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Salary Schema
 */
const SalarySchema = new Schema<ISalary>({
    min: {
        type: Number,
        required: true,
    },
    max: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        default: 'EGP',
    },
});

/**
 * Job Schema
 */
const JobSchema = new Schema<IJob>(
    {
        title: {
            type: String,
            required: [true, 'Job title is required'],
            trim: true,
            minlength: [5, 'Title must be at least 5 characters'],
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            required: [true, 'Job description is required'],
            minlength: [50, 'Description must be at least 50 characters'],
            maxlength: [5000, 'Description cannot exceed 5000 characters'],
        },
        requirements: {
            type: [String],
            required: true,
            validate: {
                validator: function (v: string[]) {
                    return v && v.length > 0;
                },
                message: 'At least one requirement is needed',
            },
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Company ID is required'],
        },
        salary: {
            type: SalarySchema,
            required: true,
        },
        location: {
            type: String,
            required: [true, 'Location is required'],
        },
        type: {
            type: String,
            enum: Object.values(JobType),
            default: JobType.ONSITE,
        },
        jobType: {
            type: String,
            enum: Object.values(JobEmploymentType),
            required: [true, 'Job employment type is required'],
        },
        contactEmail: {
            type: String,
            required: [true, 'Contact email is required'],
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        contactPhone: {
            type: String,
            trim: true,
        },
        companyLogo: {
            type: String, // Cloudinary URL
        },
        accessibilityFeatures: {
            type: [String],
            default: [],
        },
        applicants: [{
            type: Schema.Types.ObjectId,
            ref: 'Application',
        }],
        status: {
            type: String,
            enum: Object.values(JobStatus),
            default: JobStatus.DRAFT,
        },
        expiresAt: {
            type: Date,
            default: function () {
                // Default expiration: 30 days from creation
                const date = new Date();
                date.setDate(date.getDate() + 30);
                return date;
            },
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for search and filtering
JobSchema.index({ title: 'text', description: 'text' });
JobSchema.index({ companyId: 1 });
JobSchema.index({ status: 1 });
JobSchema.index({ type: 1 });
JobSchema.index({ createdAt: -1 });
JobSchema.index({ expiresAt: 1 });

/**
 * Job Model
 */
const Job: Model<IJob> = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);

export default Job;
