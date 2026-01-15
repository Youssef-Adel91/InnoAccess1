import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import Notification from '@/models/Notification';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/notifications
 * Get user notifications
 */
export async function GET(request: NextRequest) {
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

        const { searchParams } = new URL(request.url);
        const unreadOnly = searchParams.get('unreadOnly') === 'true';
        const limit = parseInt(searchParams.get('limit') || '20');

        const query: any = { userId: session.user.id };
        if (unreadOnly) {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        const unreadCount = await Notification.countDocuments({
            userId: session.user.id,
            isRead: false,
        });

        return NextResponse.json({
            success: true,
            data: {
                notifications,
                unreadCount,
            },
        });
    } catch (error: any) {
        console.error('Get notifications error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to fetch notifications',
                    code: 'FETCH_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/notifications
 * Mark all notifications as read for current user
 */
export async function PATCH(request: NextRequest) {
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

        // Mark all unread notifications as read for this user
        const result = await Notification.updateMany(
            { userId: session.user.id, isRead: false },
            { isRead: true }
        );

        return NextResponse.json({
            success: true,
            data: {
                message: 'All notifications marked as read',
                modifiedCount: result.modifiedCount
            },
        });
    } catch (error: any) {
        console.error('Mark notifications read error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to update notifications',
                    code: 'UPDATE_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
