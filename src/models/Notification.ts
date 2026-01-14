import mongoose, { Schema, Model, Document, Types } from 'mongoose';

/**
 * Notification Type Enum
 */
export enum NotificationType {
    APPLICATION_VIEWED = 'application_viewed',
    APPLICATION_STATUS_UPDATE = 'application_status_update',
    JOB_ALERT = 'job_alert',
    COURSE_UPDATE = 'course_update',
    NEW_APPLICANT = 'new_applicant',
    COMPANY_APPROVED = 'company_approved',
    COMPANY_REJECTED = 'company_rejected',
    NEW_ENROLLMENT = 'new_enrollment',
    PAYMENT_SUCCESS = 'payment_success',
    PAYMENT_FAILED = 'payment_failed',
}

/**
 * Notification Document Interface
 */
export interface INotification extends Document {
    userId: Types.ObjectId;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: Date;
}

/**
 * Notification Schema
 */
const NotificationSchema = new Schema<INotification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
        },
        type: {
            type: String,
            enum: Object.values(NotificationType),
            required: [true, 'Notification type is required'],
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        message: {
            type: String,
            required: [true, 'Message is required'],
            maxlength: [500, 'Message cannot exceed 500 characters'],
        },
        link: String,
        isRead: {
            type: Boolean,
            default: false,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: false, // Only need createdAt
    }
);

// Indexes
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1 });

/**
 * Notification Model
 */
const Notification: Model<INotification> =
    mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
