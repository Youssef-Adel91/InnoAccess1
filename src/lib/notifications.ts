import Notification, { NotificationType } from '@/models/Notification';
import { connectDB } from '@/lib/db';
import User from '@/models/User';

/**
 * Notification utility input type
 */
interface CreateNotificationInput {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
}

/**
 * Create a single notification for a user
 * 
 * @param input - Notification details
 * @returns true if successful, false otherwise
 * 
 * @note This function doesn't throw errors to prevent breaking main application flow
 */
export async function createNotification(input: CreateNotificationInput): Promise<boolean> {
    try {
        await connectDB();

        await Notification.create({
            userId: input.userId,
            type: input.type,
            title: input.title,
            message: input.message,
            link: input.link,
            isRead: false,
            createdAt: new Date(),
        });

        console.log(`✅ Notification created for user ${input.userId}: ${input.title}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed to create notification for user ${input.userId}:`, error);
        // Don't throw - notifications shouldn't break main application flow
        return false;
    }
}

/**
 * Send a broadcast notification to all users
 * 
 * @param title - Notification title
 * @param message - Notification message
 * @param link - Optional link to redirect users
 * @param excludeRoles - Optional array of roles to exclude (e.g., ['admin'])
 * @returns Number of users notified
 */
export async function notifyAllUsers(
    title: string,
    message: string,
    link?: string,
    excludeRoles?: string[]
): Promise<number> {
    try {
        await connectDB();

        // Build query to exclude certain roles
        const query: any = {};
        if (excludeRoles && excludeRoles.length > 0) {
            query.role = { $nin: excludeRoles };
        }

        // Get all users (only need IDs)
        const users = await User.find(query, '_id').lean();

        if (users.length === 0) {
            console.log('⚠️ No users found to notify');
            return 0;
        }

        // Create notification documents
        const notifications = users.map(user => ({
            userId: user._id,
            type: NotificationType.JOB_ALERT, // Generic type for broadcasts
            title,
            message,
            link,
            isRead: false,
            createdAt: new Date(),
        }));

        // Insert all notifications at once
        await Notification.insertMany(notifications);

        console.log(`✅ Broadcast notification sent to ${users.length} users`);
        return users.length;
    } catch (error) {
        console.error('❌ Failed to send broadcast notification:', error);
        return 0;
    }
}

/**
 * Pre-built notification templates for common scenarios
 */

/**
 * Notify user when their job application is viewed by company
 */
export async function notifyApplicationViewed(
    userId: string,
    jobTitle: string,
    companyName: string,
    jobId: string
): Promise<boolean> {
    return createNotification({
        userId,
        type: NotificationType.APPLICATION_VIEWED,
        title: 'Application Viewed! 👀',
        message: `Your application for "${jobTitle}" at ${companyName} was viewed by the hiring team.`,
        link: `/user/applications`,
    });
}

/**
 * Notify user about application status update
 */
export async function notifyApplicationStatusUpdate(
    userId: string,
    jobTitle: string,
    status: 'accepted' | 'rejected' | 'shortlisted',
    jobId: string
): Promise<boolean> {
    const statusMessages = {
        accepted: {
            title: 'Congratulations! 🎉',
            message: `You've been accepted for "${jobTitle}"! The company will contact you soon.`,
        },
        rejected: {
            title: 'Application Update',
            message: `Thank you for applying to "${jobTitle}". Unfortunately, we've decided to move forward with other candidates.`,
        },
        shortlisted: {
            title: 'You\'re Shortlisted! ⭐',
            message: `Great news! You've been shortlisted for "${jobTitle}". Expect to hear from us soon.`,
        },
    };

    const { title, message } = statusMessages[status];

    return createNotification({
        userId,
        type: NotificationType.APPLICATION_STATUS_UPDATE,
        title,
        message,
        link: `/jobs/${jobId}`,
    });
}

/**
 * Notify company when they receive a new job application
 */
export async function notifyNewApplicant(
    companyUserId: string,
    jobTitle: string,
    applicantName: string,
    jobId: string
): Promise<boolean> {
    return createNotification({
        userId: companyUserId,
        type: NotificationType.NEW_APPLICANT,
        title: 'New Application Received! 📋',
        message: `${applicantName} applied for "${jobTitle}". Review their application now.`,
        link: `/company/jobs/${jobId}/applicants`,
    });
}

/**
 * Notify company when their account is approved
 */
export async function notifyCompanyApproved(userId: string): Promise<boolean> {
    return createNotification({
        userId,
        type: NotificationType.COMPANY_APPROVED,
        title: 'Account Approved! ✅',
        message: 'Your company account has been approved. You can now post jobs and find talented candidates.',
        link: '/company/jobs',
    });
}

/**
 * Notify company when their account is rejected
 */
export async function notifyCompanyRejected(userId: string, reason?: string): Promise<boolean> {
    return createNotification({
        userId,
        type: NotificationType.COMPANY_REJECTED,
        title: 'Account Review Update',
        message: reason
            ? `Unfortunately, your company registration was not approved. Reason: ${reason}`
            : 'Unfortunately, your company registration was not approved. Please contact support for more details.',
        link: '/dashboard',
    });
}

/**
 * Notify trainer when course has new enrollment
 */
export async function notifyNewEnrollment(
    trainerUserId: string,
    courseName: string,
    studentName: string,
    courseId: string
): Promise<boolean> {
    return createNotification({
        userId: trainerUserId,
        type: NotificationType.NEW_ENROLLMENT,
        title: 'New Enrollment! 🎓',
        message: `${studentName} enrolled in your course "${courseName}".`,
        link: `/trainer/courses/${courseId}`,
    });
}

/**
 * Notify user about course update
 */
export async function notifyCourseUpdate(
    userId: string,
    courseName: string,
    updateMessage: string,
    courseId: string
): Promise<boolean> {
    return createNotification({
        userId,
        type: NotificationType.COURSE_UPDATE,
        title: `Update: ${courseName}`,
        message: updateMessage,
        link: `/courses/${courseId}`,
    });
}

/**
 * Notify enrolled users about upcoming LIVE workshop
 */
export async function notifyLiveWorkshopStarting(
    userId: string,
    courseName: string,
    minutesUntilStart: number,
    zoomLink: string,
    courseId: string
): Promise<boolean> {
    return createNotification({
        userId,
        type: NotificationType.COURSE_UPDATE,
        title: '🔴 LIVE Workshop Starting Soon!',
        message: `"${courseName}" starts in ${minutesUntilStart} minutes. Join the Zoom meeting now!`,
        link: `/courses/${courseId}`,
    });
}

/**
 * Notify user about payment success
 */
export async function notifyPaymentSuccess(
    userId: string,
    amount: number,
    itemName: string,
    itemType: 'course'
): Promise<boolean> {
    return createNotification({
        userId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: 'Payment Successful! ✅',
        message: `Your payment of ${amount} EGP for "${itemName}" was successful. Enjoy your ${itemType}!`,
        link: itemType === 'course' ? '/courses' : '/dashboard',
    });
}

/**
 * Notify user about payment failure
 */
export async function notifyPaymentFailed(
    userId: string,
    amount: number,
    itemName: string,
    reason?: string
): Promise<boolean> {
    return createNotification({
        userId,
        type: NotificationType.PAYMENT_FAILED,
        title: 'Payment Failed ❌',
        message: reason
            ? `Payment of ${amount} EGP for "${itemName}" failed. Reason: ${reason}`
            : `Payment of ${amount} EGP for "${itemName}" failed. Please try again.`,
        link: '/dashboard',
    });
}
