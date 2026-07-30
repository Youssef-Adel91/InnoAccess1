import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Course from '@/models/Course';
import Order, { OrderStatus, PaymentMethod } from '@/models/Order';

/**
 * GET /api/admin/orders
 * Get pending manual payment orders for admin review
 */
export async function GET() {
    try {
        const user = await currentUser();
        const userRole = (user?.publicMetadata?.role || user?.unsafeMetadata?.role) as string | undefined;

        if (!user || userRole !== 'admin') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Unauthorized',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 403 }
            );
        }

        await connectDB();

        // Get pending manual orders
        const orders = await Order.find({
            paymentMethod: PaymentMethod.MANUAL,
            status: OrderStatus.PENDING,
        })
            .populate('userId', 'name email')
            .populate('courseId', 'title')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({
            success: true,
            data: {
                orders: JSON.parse(JSON.stringify(orders)),
            },
        });
    } catch (error: any) {
        console.error('❌ Get admin orders error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to fetch orders',
                    code: 'GET_ORDERS_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
