import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import Notification, { NotificationType } from '@/models/Notification';
import { initiateCardPayment, initiateWalletPayment } from '@/lib/paymob';
import { authOptions } from '@/lib/auth';

/**
 * Enrollment Schema
 */
const enrollSchema = z.object({
    paymentMethod: z.enum(['card', 'wallet']),
    billingData: z.object({
        email: z.string().email(),
        first_name: z.string(),
        last_name: z.string(),
        phone_number: z.string(),
        city: z.string(),
        country: z.string().default('EG'),
    }),
});

/**
 * POST /api/courses/[id]/enroll
 * Enroll in a course (with payment)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'user') {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Only users can enroll in courses',
                        code: 'UNAUTHORIZED',
                    },
                },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validationResult = enrollSchema.safeParse(body);

        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: validationResult.error.errors[0].message,
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        await connectDB();

        // Check if course exists and is published
        const course = await Course.findById(params.id);

        if (!course) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Course not found',
                        code: 'NOT_FOUND',
                    },
                },
                { status: 404 }
            );
        }

        if (!course.isPublished) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'This course is not available for enrollment',
                        code: 'COURSE_UNPUBLISHED',
                    },
                },
                { status: 400 }
            );
        }

        // Check if user already enrolled
        const existingEnrollment = await Enrollment.findOne({
            courseId: params.id,
            userId: session.user.id,
        });

        if (existingEnrollment) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'You are already enrolled in this course',
                        code: 'ALREADY_ENROLLED',
                    },
                },
                { status: 409 }
            );
        }

        // Initiate payment with Paymob
        const { paymentMethod, billingData } = validationResult.data;
        const merchantOrderId = `COURSE_${params.id}_USER_${session.user.id}_${Date.now()}`;

        let paymentUrl;

        try {
            if (paymentMethod === 'card') {
                paymentUrl = await initiateCardPayment(course.price, merchantOrderId, billingData);
            } else {
                const paymentToken = await initiateWalletPayment(course.price, merchantOrderId, billingData);
                // For wallet, you'd need additional processing
                paymentUrl = `https://accept.paymob.com/api/acceptance/payments/pay?payment_token=${paymentToken}`;
            }
        } catch (paymentError: any) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Payment initiation failed',
                        code: 'PAYMENT_ERROR',
                    },
                },
                { status: 500 }
            );
        }

        // Create pending enrollment (will be activated after payment confirmation)
        const enrollment = await Enrollment.create({
            courseId: params.id,
            userId: session.user.id,
            paymentId: merchantOrderId,
            progress: [],
            lastWatched: {
                moduleIndex: 0,
                videoIndex: 0,
                timestamp: 0,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                enrollment,
                paymentUrl,
                message: 'Redirecting to payment gateway...',
            },
        });
    } catch (error: any) {
        console.error('Course enrollment error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to enroll in course',
                    code: 'ENROLLMENT_ERROR',
                },
            },
            { status: 500 }
        );
    }
}

/**
 * GET /api/courses/[id]/enroll
 * Check enrollment status
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json({
                success: true,
                data: { isEnrolled: false },
            });
        }

        await connectDB();

        const enrollment = await Enrollment.findOne({
            courseId: params.id,
            userId: session.user.id,
        });

        return NextResponse.json({
            success: true,
            data: {
                isEnrolled: !!enrollment,
                enrollment,
            },
        });
    } catch (error: any) {
        console.error('Check enrollment error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'Failed to check enrollment status',
                    code: 'CHECK_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
