import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';
import Notification, { NotificationType } from '@/models/Notification';
import { paymobClient } from '@/lib/paymob';

/**
 * POST /api/webhooks/paymob
 * Handle Paymob payment webhook
 */
export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const receivedHmac = searchParams.get('hmac');

        if (!receivedHmac) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing HMAC',
                },
                { status: 400 }
            );
        }

        const webhookData = await request.json();

        // Verify HMAC signature
        const isValid = paymobClient.verifyHmac(webhookData, receivedHmac);

        if (!isValid) {
            console.error('Invalid HMAC signature');
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid signature',
                },
                { status: 403 }
            );
        }

        // Check if payment was successful
        if (!webhookData.success) {
            console.log('Payment failed:', webhookData);

            // Create failure notification
            const paymentId = webhookData.order?.merchant_order_id;
            if (paymentId) {
                await connectDB();

                const enrollment = await Enrollment.findOne({ paymentId });

                if (enrollment) {
                    await Notification.create({
                        userId: enrollment.userId,
                        type: NotificationType.PAYMENT_FAILED,
                        title: 'Payment Failed',
                        message: 'Your course enrollment payment was unsuccessful. Please try again.',
                        link: '/dashboard/courses',
                    });

                    // Delete pending enrollment
                    await Enrollment.findByIdAndDelete(enrollment._id);
                }
            }

            return NextResponse.json({ success: true, message: 'Payment failed processed' });
        }

        // Payment was successful
        const paymentId = webhookData.order?.merchant_order_id;

        if (!paymentId) {
            console.error('No merchant order ID in webhook');
            return NextResponse.json({ success: true });
        }

        await connectDB();

        // Find the enrollment
        const enrollment = await Enrollment.findOne({ paymentId }).populate('courseId');

        if (!enrollment) {
            console.log('Enrollment not found for payment ID:', paymentId);
            return NextResponse.json({ success: true });
        }

        // SECURITY FIX: Idempotency check - prevent replay attacks
        if (enrollment.isPaymentProcessed) {
            console.log('⚠️  Payment already processed, ignoring duplicate webhook:', paymentId);
            return NextResponse.json({
                success: true,
                message: 'Payment already processed (idempotent)'
            });
        }

        // Mark as processed immediately
        enrollment.isPaymentProcessed = true;
        await enrollment.save();

        // Type assertion for populated course
        const course = enrollment.courseId as any as import('@/models/Course').ICourse;

        // Update course enrollment count
        await Course.findByIdAndUpdate(enrollment.courseId, {
            $inc: { enrollmentCount: 1 },
        });

        // Create success notification
        await Notification.create({
            userId: enrollment.userId,
            type: NotificationType.PAYMENT_SUCCESS,
            title: 'Enrollment Confirmed',
            message: `You're now enrolled in ${course.title}!`,
            link: `/courses/${course._id}`,
        });

        // Notify trainer
        await Notification.create({
            userId: course.trainerId,
            type: NotificationType.NEW_ENROLLMENT,
            title: 'New Student Enrolled',
            message: `A new student has enrolled in your course: ${course.title}`,
            link: `/trainer/courses/${course._id}`,
        });

        console.log('✅ Payment processed successfully for:', paymentId);

        return NextResponse.json({
            success: true,
            message: 'Webhook processed',
        });
    } catch (error: any) {
        console.error('Webhook processing error:', error);

        // Always return 200 to Paymob to prevent retries
        return NextResponse.json({
            success: false,
            error: error.message,
        });
    }
}
