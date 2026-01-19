'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Order, { OrderStatus, PaymentMethod } from '@/models/Order';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import { put } from '@vercel/blob';
import { Types } from 'mongoose';
import { initiateCardPayment, initiateWalletPayment, BillingData } from '@/lib/paymob';
import { CURRENCY } from '@/lib/payment-constants';
import { sendEmail } from '@/lib/mail';

/**
 * Submit manual payment with receipt screenshot
 */
export async function submitManualPayment(courseId: string, formData: FormData) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            throw new Error('You must be logged in');
        }

        await connectDB();

        // Get course
        const course = await Course.findById(courseId);
        if (!course) {
            throw new Error('Course not found');
        }

        if (course.isFree) {
            throw new Error('This course is free, no payment required');
        }

        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({
            userId: session.user.id,
            courseId: courseId,
        });

        if (existingEnrollment) {
            throw new Error('You are already enrolled in this course');
        }

        // Check for pending order
        const pendingOrder = await Order.findOne({
            userId: session.user.id,
            courseId: courseId,
            status: OrderStatus.PENDING,
        });

        if (pendingOrder) {
            throw new Error('You already have a pending payment for this course');
        }

        // Get receipt file
        const receiptFile = formData.get('receipt') as File;
        if (!receiptFile) {
            throw new Error('Receipt screenshot is required');
        }

        // Validate file
        if (!receiptFile.type.startsWith('image/')) {
            throw new Error('Receipt must be an image file');
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        if (receiptFile.size > maxSize) {
            throw new Error('Receipt file size must be less than 5MB');
        }

        // Upload to Vercel Blob
        const blob = await put(
            `receipts/${session.user.id}/${courseId}-${Date.now()}.${receiptFile.name.split('.').pop()}`,
            receiptFile,
            {
                access: 'public',
                addRandomSuffix: false,
            }
        );

        // Get phone number from form
        const phoneNumber = formData.get('phoneNumber') as string;

        // Create order
        const order = await Order.create({
            userId: new Types.ObjectId(session.user.id),
            courseId: new Types.ObjectId(courseId),
            amount: course.price,
            currency: CURRENCY,
            status: OrderStatus.PENDING,
            paymentMethod: PaymentMethod.MANUAL,
            receiptUrl: blob.url,
            manualTransferNumber: phoneNumber || undefined,
        });

        console.log('✅ Manual payment submitted:', order._id);

        return {
            success: true,
            data: {
                message: 'Payment submitted for review. You will be enrolled once approved.',
                orderId: order._id.toString(),
            },
        };
    } catch (error: any) {
        console.error('❌ Submit manual payment error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to submit payment',
                code: 'SUBMIT_MANUAL_PAYMENT_ERROR',
            },
        };
    }
}

/**
 * Initialize Paymob payment (Card or Wallet)
 */
export async function initPaymobPayment(
    courseId: string,
    paymentType: 'CARD' | 'WALLET',
    phoneNumber?: string
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            throw new Error('You must be logged in');
        }

        await connectDB();

        // Get course
        const course = await Course.findById(courseId);
        if (!course) {
            throw new Error('Course not found');
        }

        if (course.isFree) {
            throw new Error('This course is free, no payment required');
        }

        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({
            userId: session.user.id,
            courseId: courseId,
        });

        if (existingEnrollment) {
            throw new Error('You are already enrolled in this course');
        }

        // Create order first
        const order = await Order.create({
            userId: new Types.ObjectId(session.user.id),
            courseId: new Types.ObjectId(courseId),
            amount: course.price,
            currency: CURRENCY,
            status: OrderStatus.PENDING,
            paymentMethod: PaymentMethod.PAYMOB,
        });

        // Prepare billing data
        const billingData: BillingData = {
            email: session.user.email || `user${session.user.id}@innoaccess.com`,
            first_name: session.user.name?.split(' ')[0] || 'Student',
            last_name: session.user.name?.split(' ').slice(1).join(' ') || 'User',
            phone_number: phoneNumber || '+20100000000',
            city: 'Cairo',
            country: 'EG',
        };

        // Amount in cents (already stored in cents in DB)
        const amountCents = course.price;

        // Initiate payment with Paymob
        let paymentUrl: string;
        let paymobOrderId: number;

        if (paymentType === 'CARD') {
            const result = await initiateCardPayment(
                amountCents,
                order._id.toString(),
                billingData
            );
            paymentUrl = result.paymentUrl;
            paymobOrderId = result.paymobOrderId;
        } else {
            // Wallet
            if (!phoneNumber) {
                throw new Error('Phone number is required for wallet payment');
            }
            const result = await initiateWalletPayment(
                amountCents,
                order._id.toString(),
                billingData,
                phoneNumber
            );
            paymentUrl = result.paymentUrl;
            paymobOrderId = result.paymobOrderId;
        }

        // Store Paymob order ID for verification
        order.paymobOrderId = paymobOrderId.toString();
        await order.save();

        console.log('✅ Paymob payment initiated:', order._id, 'Paymob Order ID:', paymobOrderId);

        // Note: paymobTransactionId will be stored when webhook is received
        // or can be manually verified using verifyPaymentStatus action

        return {
            success: true,
            data: {
                paymentUrl,
                orderId: order._id.toString(),
            },
        };
    } catch (error: any) {
        console.error('❌ Init Paymob payment error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to initialize payment',
                code: 'INIT_PAYMOB_PAYMENT_ERROR',
            },
        };
    }
}

/**
 * ADMIN: Approve manual payment
 */
export async function approveManualPayment(orderId: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            throw new Error('Unauthorized');
        }

        await connectDB();

        const order = await Order.findById(orderId)
            .populate('userId', 'name email')
            .populate('courseId', 'title');
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.status !== OrderStatus.PENDING) {
            throw new Error('Order is not pending');
        }

        // Update order
        order.status = OrderStatus.COMPLETED;
        order.reviewedBy = new Types.ObjectId(session.user.id);
        order.reviewedAt = new Date();
        await order.save();

        // Create enrollment
        await Enrollment.create({
            userId: order.userId,
            courseId: order.courseId,
            orderId: order._id,
            paymentStatus: 'PAID',
            progress: [],
        });

        // Update course enrollment count - ensure Course model is loaded
        try {
            await Course.findByIdAndUpdate(order.courseId, {
                $inc: { enrollmentCount: 1 },
            });
        } catch (courseError) {
            console.warn('⚠️ Could not update course enrollment count:', courseError);
            // Don't fail the approval if course update fails
        }

        console.log('📋 Checking email conditions for approval...');
        console.log('userId type:', typeof order.userId);
        console.log('userId:', order.userId);
        console.log('courseId type:', typeof order.courseId);
        console.log('courseId:', order.courseId);

        // Send approval email
        if (order.userId && typeof order.userId === 'object' && 'email' in order.userId && order.userId.email) {
            const userName = typeof order.userId === 'object' && 'name' in order.userId ? order.userId.name : 'User';
            const courseTitle = typeof order.courseId === 'object' && 'title' in order.courseId ? order.courseId.title : 'Course';

            console.log(`📧 Preparing approval email for: ${order.userId.email}`);
            console.log(`User: ${userName}, Course: ${courseTitle}`);

            const approvalEmailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #16a34a; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Payment Approved!</h1>
        </div>
        <div class="content">
            <h2>Dear ${userName},</h2>
            <p>Great news! Your payment for the course <strong>${courseTitle}</strong> has been approved!</p>
            
            <div class="success-box">
                <strong>✅ You're all set!</strong><br>
                You now have full access to the course and can start learning immediately.
            </div>
            
            <h3>What's next?</h3>
            <ul>
                <li>Access your course from the dashboard</li>
                <li>Start watching the lessons at your own pace</li>
                <li>Track your progress as you learn</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="${process.env.NEXTAUTH_URL || 'https://inno-access1.vercel.app'}/courses/${order.courseId}" class="button">Start Learning Now</a>
            </p>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>The InnoAccess Team</strong><br>
            innoaccess2@gmail.com</p>
        </div>
        <div class="footer">
            <p>This is an automated message from InnoAccess Platform</p>
        </div>
    </div>
</body>
</html>
            `;

            console.log('🔄 Calling sendEmail function...');
            try {
                const emailSent = await sendEmail({
                    to: order.userId.email as string,
                    subject: `Payment Approved - Welcome to ${courseTitle}!`,
                    html: approvalEmailHtml,
                });

                if (emailSent) {
                    console.log(`✅ Approval email sent successfully to ${order.userId.email}`);
                } else {
                    console.error(`❌ Failed to send approval email to ${order.userId.email}`);
                }
            } catch (emailError) {
                console.error('❌ Error sending approval email:', emailError);
            }
        } else {
            console.log('⚠️ Approval email not sent - conditions not met:');
            console.log('   - userId exists:', !!order.userId);
            console.log('   - userId is object:', typeof order.userId === 'object');
            console.log('   - has email property:', order.userId && 'email' in order.userId);
            console.log('   - email value:', order.userId && typeof order.userId === 'object' && 'email' in order.userId ? order.userId.email : 'N/A');
        }

        console.log('✅ Manual payment approved:', orderId);

        return {
            success: true,
            data: {
                message: 'Payment approved and student enrolled',
            },
        };
    } catch (error: any) {
        console.error('❌ Approve manual payment error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to approve payment',
                code: 'APPROVE_PAYMENT_ERROR',
            },
        };
    }
}

/**
 * ADMIN: Reject manual payment
 */
export async function rejectManualPayment(orderId: string, reason: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            throw new Error('Unauthorized');
        }

        await connectDB();

        const order = await Order.findById(orderId)
            .populate('userId', 'name email')
            .populate('courseId', 'title');
        if (!order) {
            throw new Error('Order not found');
        }

        if (order.status !== OrderStatus.PENDING) {
            throw new Error('Order is not pending');
        }

        // Update order
        order.status = OrderStatus.REJECTED;
        order.rejectionReason = reason;
        order.reviewedBy = new Types.ObjectId(session.user.id);
        order.reviewedAt = new Date();
        await order.save();

        // Send rejection email
        if (order.userId && typeof order.userId === 'object' && 'email' in order.userId && order.userId.email) {
            const userName = typeof order.userId === 'object' && 'name' in order.userId ? order.userId.name : 'User';
            const courseTitle = typeof order.courseId === 'object' && 'title' in order.courseId ? order.courseId.title : 'Course';

            const rejectionEmailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .reason-box { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Payment Rejected</h1>
        </div>
        <div class="content">
            <h2>Dear ${userName},</h2>
            <p>We regret to inform you that your payment for the course <strong>${courseTitle}</strong> has been rejected.</p>
            
            <div class="reason-box">
                <strong>Reason:</strong><br>
                ${reason}
            </div>
            
            <h3>What to do next:</h3>
            <ul>
                <li>Please review the rejection reason above</li>
                <li>If you believe this is an error, contact us at <strong>innoaccess2@gmail.com</strong></li>
                <li>You can submit a new payment with correct information</li>
            </ul>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>The InnoAccess Team</strong><br>
            innoaccess2@gmail.com</p>
        </div>
        <div class="footer">
            <p>This is an automated message from InnoAccess Platform</p>
        </div>
    </div>
</body>
</html>
            `;

            await sendEmail({
                to: order.userId.email as string,
                subject: `Payment Rejected - ${courseTitle}`,
                html: rejectionEmailHtml,
            });

            console.log(`✅ Rejection email sent to ${order.userId.email}`);
        }

        console.log('✅ Manual payment rejected:', orderId);

        return {
            success: true,
            data: {
                message: 'Payment rejected',
            },
        };
    } catch (error: any) {
        console.error('❌ Reject manual payment error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to reject payment',
                code: 'REJECT_PAYMENT_ERROR',
            },
        };
    }
}

/**
 * Verify payment status manually (fallback when webhook fails)
 */
export async function verifyPaymentStatus(orderId: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            throw new Error('You must be logged in');
        }

        await connectDB();

        // Get the order
        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error('Order not found');
        }

        // Check if already completed
        if (order.status === OrderStatus.COMPLETED) {
            return {
                success: true,
                data: {
                    message: 'Payment already verified',
                    status: 'COMPLETED',
                },
            };
        }

        // Only verify Paymob payments
        if (order.paymentMethod !== PaymentMethod.PAYMOB) {
            throw new Error('Can only verify Paymob payments');
        }

        // Check if this order belongs to the current user
        if (order.userId.toString() !== session.user.id) {
            throw new Error('Unauthorized');
        }

        // Check if we have paymobOrderId
        if (!order.paymobOrderId) {
            return {
                success: false,
                error: {
                    message: 'Payment not initialized properly. Please try payment again.',
                    code: 'NO_PAYMOB_ORDER_ID',
                },
            };
        }

        // Query Paymob transactions using paymobOrderId
        const { paymobClient } = await import('@/lib/paymob');

        try {
            const transactions = await paymobClient.getOrderTransactions(order.paymobOrderId);
            const successfulTxn = transactions.find((txn: any) => txn.success === true);

            if (!successfulTxn) {
                return {
                    success: false,
                    error: {
                        message: 'Payment not confirmed yet. Please complete payment and try again.',
                        code: 'PAYMENT_NOT_CONFIRMED',
                    },
                };
            }

            // Update order with transaction details
            order.status = OrderStatus.COMPLETED;
            order.paymobTransactionId = successfulTxn.id?.toString();
            await order.save();

            // Check if enrollment already exists
            const existingEnrollment = await Enrollment.findOne({
                userId: order.userId,
                courseId: order.courseId,
            });

            if (!existingEnrollment) {
                await Enrollment.create({
                    userId: order.userId,
                    courseId: order.courseId,
                    orderId: order._id,
                    paymentStatus: 'PAID',
                    progress: [],
                });

                await Course.findByIdAndUpdate(order.courseId, {
                    $inc: { enrollmentCount: 1 },
                });

                console.log('✅ Manual verification: Enrollment created for order:', orderId);
            }

            return {
                success: true,
                data: {
                    message: 'Payment verified successfully!',
                    status: 'COMPLETED',
                },
            };
        } catch (paymobError: any) {
            console.error('Paymob query error:', paymobError);
            return {
                success: false,
                error: {
                    message: 'Unable to verify payment. Please try again or contact support.',
                    code: 'PAYMOB_QUERY_ERROR',
                },
            };
        }
    } catch (error: any) {
        console.error('❌ Verify payment status error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to verify payment status',
                code: 'VERIFY_PAYMENT_ERROR',
            },
        };
    }
}
