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
        let userRole = (user?.publicMetadata?.role || user?.unsafeMetadata?.role) as string | undefined;

        if (!user) {
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

        if (userRole !== 'admin') {
            const email = user.emailAddresses[0]?.emailAddress?.toLowerCase().trim();
            if (email) {
                const mongoUser = await User.findOne({ email });
                if (mongoUser?.role === 'admin') {
                    userRole = 'admin';
                }
            }
        }

        if (userRole !== 'admin') {
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

        // Get pending manual, Vodafone Cash, Instapay orders OR any pending order with a receipt screenshot
        const orders = await Order.find({
            status: OrderStatus.PENDING,
            $or: [
                {
                    paymentMethod: {
                        $in: [
                            PaymentMethod.MANUAL,
                            PaymentMethod.VODAFONE_CASH,
                            PaymentMethod.INSTAPAY,
                        ],
                    },
                },
                { receiptUrl: { $exists: true, $ne: null } },
            ],
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
