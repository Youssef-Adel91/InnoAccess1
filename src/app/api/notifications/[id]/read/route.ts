import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import Notification from '@/models/Notification';
import { authOptions } from '@/lib/auth';

/**
 * PATCH /api/notifications/[id]/read
 * Mark a specific notification as read
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Authentication required',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        await connectDB();

        const notificationId = params.id;

        // Find the notification and verify ownership
        const notification = await Notification.findById(notificationId);

        if (!notification) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Notification not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        // Verify that the notification belongs to the current user
        if (notification.userId.toString() !== session.user.id) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You do not have permission to modify this notification',
                        code: 'FORBIDDEN',
                    },
                },
                { status: 403 }
            );
        }

        // Mark as read
        notification.isRead = true;
        await notification.save();

        return NextResponse.json({
            success: true,
            data: {
                message: 'Notification marked as read',
                notification: {
                    id: notification._id,
                    isRead: notification.isRead,
                },
            },
        });
    } catch (error: any) {
        console.error('Mark notification as read error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to mark notification as read',
                    code: 'UPDATE_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
