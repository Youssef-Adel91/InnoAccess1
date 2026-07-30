import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import Order, { OrderStatus } from '@/models/Order';
import User from '@/models/User';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import Commission from '@/models/Commission';
import { attributeAffiliateCommission } from '@/lib/affiliateUtils';
import { executeRevenueSplit } from '@/lib/revenueSplitEngine';
import { Types } from 'mongoose';

/**
 * POST /api/admin/orders/[id]/approve
 *
 * Admin API route to approve an order (manual, Vodafone Cash, Instapay, etc.),
 * enroll the student, execute revenue split, and safely attribute affiliate commission.
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: orderId } = await params;
        const clerkUser = await currentUser();
        let userRole = (clerkUser?.publicMetadata?.role || clerkUser?.unsafeMetadata?.role) as string | undefined;

        if (!clerkUser) {
            return NextResponse.json(
                { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        await connectDB();

        // Fallback to database role check if metadata not synced yet
        if (userRole !== 'admin') {
            const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().trim();
            if (email) {
                const mongoUser = await User.findOne({ email }).select('role').lean();
                if (mongoUser?.role === 'admin') {
                    userRole = 'admin';
                }
            }
        }

        if (userRole !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        const order = await Order.findById(orderId)
            .populate('userId', 'name email')
            .populate('courseId', 'title');

        if (!order) {
            return NextResponse.json(
                { success: false, error: { message: 'Order not found', code: 'NOT_FOUND' } },
                { status: 404 }
            );
        }

        if (order.status !== OrderStatus.PENDING) {
            return NextResponse.json(
                { success: false, error: { message: `Order is already ${order.status}`, code: 'INVALID_STATUS' } },
                { status: 400 }
            );
        }

        // 1. Update order status to COMPLETED
        order.status = OrderStatus.COMPLETED;
        order.reviewedAt = new Date();
        await order.save();

        const rawUserId = typeof order.userId === 'object' && order.userId && '_id' in order.userId ? (order.userId as any)._id : order.userId;
        const rawCourseId = typeof order.courseId === 'object' && order.courseId && '_id' in order.courseId ? (order.courseId as any)._id : order.courseId;

        // 2. Create Enrollment for the student (idempotent)
        await Enrollment.findOneAndUpdate(
            { userId: rawUserId, courseId: rawCourseId },
            {
                $setOnInsert: {
                    userId: rawUserId,
                    courseId: rawCourseId,
                    orderId: order._id,
                    enrolledAt: new Date(),
                    progress: 0,
                    completedLessons: [],
                },
            },
            { upsert: true, new: true }
        );

        // 3. Increment course enrollment count
        try {
            await Course.findByIdAndUpdate(rawCourseId, {
                $inc: { enrollmentCount: 1 },
            });
        } catch (courseError) {
            console.warn('⚠️ Could not update course enrollment count:', courseError);
        }

        // 4. Execute Revenue Split Engine
        const courseDoc = await Course.findById(rawCourseId)
            .select('trainerId contract').lean();

        await executeRevenueSplit({
            orderId: order._id as Types.ObjectId,
            buyerId: rawUserId as Types.ObjectId,
            trainerId: courseDoc?.trainerId as Types.ObjectId,
            courseId: rawCourseId as Types.ObjectId,
            amountCents: order.amount,
            paymentMethod: order.paymentMethod,
            contract: courseDoc?.contract,
            affiliateRef: order.affiliateRef ?? null,
        }).catch((err) => {
            console.warn(`⚠️ Revenue split warning for order ${orderId}:`, err);
        });

        // 5. Dedicated Affiliate Commission Generation (Isolated & Non-Fatal)
        if (order.affiliateRef && typeof order.affiliateRef === 'string' && order.affiliateRef.trim() !== '') {
            try {
                const refCode = order.affiliateRef.trim().toUpperCase();
                console.log(`ℹ️ Attributing affiliate commission for order ${orderId} with code: ${refCode}`);
                await attributeAffiliateCommission(
                    order._id as Types.ObjectId,
                    rawUserId as Types.ObjectId,
                    rawCourseId as Types.ObjectId,
                    order.amount,
                    refCode
                );
                console.log(`✅ Affiliate commission created/verified for order ${orderId}`);
            } catch (affiliateError) {
                // Ensure commission error does NOT crash order approval
                console.error(`⚠️ Non-fatal error generating affiliate commission for order ${orderId}:`, affiliateError);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Order approved successfully and commission attributed.',
            data: {
                orderId: order._id.toString(),
                status: order.status,
                affiliateRef: order.affiliateRef || null,
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to approve order';
        console.error('❌ Error in order approval API:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'APPROVAL_ERROR' } },
            { status: 500 }
        );
    }
}
