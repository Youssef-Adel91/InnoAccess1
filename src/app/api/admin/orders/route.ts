import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Order, { OrderStatus, PaymentMethod } from '@/models/Order';

/**
 * GET /api/admin/orders
 * Get pending manual payment orders for admin review
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
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

        // Get all pending orders (both manual and Paymob)
        const orders = await Order.find({
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
