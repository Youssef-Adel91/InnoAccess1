import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import Order, { OrderStatus } from '@/models/Order';
import User from '@/models/User';
import Commission from '@/models/Commission';

/**
 * GET /api/admin/orders/commission-debug
 *
 * Returns a diagnostic snapshot of all completed orders, their affiliateRef,
 * and whether a Commission document exists for each.
 * Admin only.
 */
export async function GET(req: NextRequest) {
    try {
        const clerkUser = await currentUser();
        if (!clerkUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().trim();
        const mongoUser = await User.findOne({ email }).select('role').lean();
        const isAdmin =
            (clerkUser.publicMetadata?.role === 'admin') ||
            (clerkUser.unsafeMetadata?.role === 'admin') ||
            mongoUser?.role === 'admin';

        if (!isAdmin) {
            return NextResponse.json({ success: false, error: 'Admin only' }, { status: 403 });
        }

        // --- Fetch all completed orders ---
        const completedOrders = await Order.find({ status: OrderStatus.COMPLETED })
            .sort({ createdAt: -1 })
            .lean();

        // --- Fetch all commissions ---
        const allCommissions = await Commission.find({}).lean();

        // --- Fetch all volunteers ---
        const volunteers = await User.find({ role: 'volunteer' })
            .select('name email affiliateCode isActive _id')
            .lean();

        // --- Build diagnostic per order ---
        const orderDiagnostics = await Promise.all(
            completedOrders.map(async (order) => {
                const commission = allCommissions.find(
                    (c) => c.orderId.toString() === order._id.toString()
                );

                const buyer = await User.findById(order.userId).select('name email role').lean();

                return {
                    orderId: order._id.toString(),
                    createdAt: order.createdAt,
                    amount: order.amount,
                    paymentMethod: order.paymentMethod,
                    affiliateRef: order.affiliateRef || null,
                    buyer: buyer
                        ? { id: order.userId.toString(), name: buyer.name, email: buyer.email, role: buyer.role }
                        : { id: order.userId.toString(), name: '(not found)' },
                    hasCommission: !!commission,
                    commission: commission
                        ? {
                              id: commission._id.toString(),
                              volunteerId: commission.volunteerId.toString(),
                              affiliateCode: commission.affiliateCode,
                              commissionAmount: commission.commissionAmount,
                              status: commission.status,
                          }
                        : null,
                };
            })
        );

        return NextResponse.json({
            success: true,
            summary: {
                totalCompletedOrders: completedOrders.length,
                ordersWithCommission: orderDiagnostics.filter((o) => o.hasCommission).length,
                ordersMissingCommission: orderDiagnostics.filter((o) => !o.hasCommission).length,
                totalCommissionsInDB: allCommissions.length,
            },
            volunteers: volunteers.map((v) => ({
                id: v._id.toString(),
                name: v.name,
                email: v.email,
                affiliateCode: v.affiliateCode,
                isActive: v.isActive,
            })),
            orders: orderDiagnostics,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Commission debug error:', error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
