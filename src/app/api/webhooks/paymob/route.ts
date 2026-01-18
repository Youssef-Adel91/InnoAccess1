import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Order, { OrderStatus, PaymentMethod } from '@/models/Order';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';
import { Types } from 'mongoose';

/**
 * POST /api/webhooks/paymob
 * Handle Paymob payment webhooks with HMAC validation
 * 
 * CRITICAL: This webhook auto-enrolls students upon successful payment
 */
export async function POST(req: NextRequest) {
    try {
        // 1. استلام البيانات من Paymob
        const data = await req.json();
        const { obj } = data;

        if (!obj) {
            console.error('❌ Webhook: No obj in payload');
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        // 2. التحقق من الأمان (HMAC Validation)
        const hmacSecret = process.env.PAYMOB_HMAC_SECRET;

        if (!hmacSecret) {
            console.error('❌ Missing PAYMOB_HMAC_SECRET');
            return NextResponse.json({ error: 'Server Configuration Error' }, { status: 500 });
        }

        // ترتيب الحقول ده مهم جداً - حسب وثائق Paymob
        const hmacString = [
            obj.amount_cents,
            obj.created_at,
            obj.currency,
            obj.error_occured,
            obj.has_parent_transaction,
            obj.id,
            obj.integration_id,
            obj.is_3d_secure,
            obj.is_auth,
            obj.is_capture,
            obj.is_refunded,
            obj.is_standalone_payment,
            obj.is_voided,
            obj.order.id,
            obj.owner,
            obj.pending,
            obj.source_data?.pan || '',
            obj.source_data?.sub_type || '',
            obj.source_data?.type || '',
            obj.success,
        ].join('');

        const crypto = require('crypto');
        const calculatedHmac = crypto
            .createHmac('sha512', hmacSecret)
            .update(hmacString)
            .digest('hex');

        const receivedHmac = req.nextUrl.searchParams.get('hmac');

        if (receivedHmac && receivedHmac !== calculatedHmac) {
            console.error('⛔ HMAC Validation Failed!');
            console.error('Expected:', calculatedHmac);
            console.error('Received:', receivedHmac);
            return NextResponse.json({ message: 'Invalid HMAC' }, { status: 403 });
        }

        console.log('✅ HMAC Validated');

        await connectDB();

        // 3. البحث عن الطلب في الداتابيز
        // Paymob بيبعت merchant_order_id اللي هو الـ _id بتاع Order عندنا
        const merchantOrderId = obj.order?.merchant_order_id;

        if (!merchantOrderId) {
            console.error('❌ No merchant_order_id in webhook');
            return NextResponse.json({ error: 'No merchant_order_id' }, { status: 400 });
        }

        const order = await Order.findById(merchantOrderId);

        if (!order) {
            console.error(`⚠️ Order not found: ${merchantOrderId}`);
            return NextResponse.json({ message: 'Order not found' }, { status: 404 });
        }

        // 4. منع التكرار (Idempotency) - CRITICAL!
        if (order.status === OrderStatus.COMPLETED) {
            console.log('ℹ️ Order already completed. Skipping.');
            return NextResponse.json({ message: 'Already processed' }, { status: 200 });
        }

        // 5. التحقق من نجاح العملية
        if (obj.success === true) {
            console.log(`✅ Payment Successful for Order: ${order._id}`);

            // أ) تحديث حالة الطلب
            order.status = OrderStatus.COMPLETED;
            order.paymobOrderId = obj.order.id.toString();
            order.paymobTransactionId = obj.id.toString();
            await order.save();

            console.log('✅ Order status updated to COMPLETED');

            // ب) تسجيل الطالب في الكورس (Enrollment)
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
                    enrolledAt: new Date(),
                });

                console.log(`🎓 User ${order.userId} enrolled in Course ${order.courseId}`);

                // ج) تحديث عدد المسجلين في الكورس
                await Course.findByIdAndUpdate(order.courseId, {
                    $inc: { enrollmentCount: 1 },
                });

                console.log('✅ Course enrollment count updated');
            } else {
                console.log('ℹ️ Enrollment already exists');
            }
        } else {
            // حالة الفشل
            console.log(`❌ Payment Failed/Pending for Order: ${order._id}`);
            order.status = OrderStatus.REJECTED;
            order.paymobTransactionId = obj.id.toString();
            order.rejectionReason = 'Payment failed or cancelled';
            await order.save();
        }

        return NextResponse.json({ message: 'Webhook processed successfully' }, { status: 200 });
    } catch (error: any) {
        console.error('🔥 Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
