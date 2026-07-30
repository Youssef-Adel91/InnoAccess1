import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import Order, { OrderStatus } from '@/models/Order';
import User from '@/models/User';
import Commission from '@/models/Commission';
import { attributeAffiliateCommission } from '@/lib/affiliateUtils';

export async function GET(req: NextRequest) {
    return handleRepair(req);
}

export async function POST(req: NextRequest) {
    return handleRepair(req);
}

async function handleRepair(req: NextRequest) {
    try {
        const user = await currentUser();
        let userRole = (user?.publicMetadata?.role || user?.unsafeMetadata?.role) as string | undefined;

        if (!user) {
            return NextResponse.json(
                { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
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
                { success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        // Optional query param or body param ?code=VOL_XXXX if admin wants a specific volunteer code
        const searchParams = req.nextUrl.searchParams;
        const requestedCode = searchParams.get('code')?.toUpperCase();

        // 1. Find all completed orders ordered most recent first
        const completedOrders = await Order.find({ status: OrderStatus.COMPLETED })
            .sort({ createdAt: -1 });

        const repaired: Array<{ orderId: string; volunteerName: string; affiliateCode: string }> = [];

        for (const order of completedOrders) {
            // Check if commission already exists for this order
            const existingCommission = await Commission.exists({ orderId: order._id });
            if (existingCommission) {
                continue;
            }

            // Determine which volunteer code to attribute
            let refCode = order.affiliateRef || requestedCode;

            // If no specific referral code was stored on the order, find an active volunteer in the system
            if (!refCode || !/^VOL_[A-Z0-9]{6}$/i.test(refCode)) {
                const activeVol = await User.findOne({ role: 'volunteer', isActive: { $ne: false } });
                if (activeVol) {
                    if (!activeVol.affiliateCode) {
                        const { generateAffiliateCode } = await import('@/lib/affiliateUtils');
                        activeVol.affiliateCode = generateAffiliateCode();
                        await activeVol.save();
                    }
                    refCode = activeVol.affiliateCode;
                }
            }

            if (refCode && /^VOL_[A-Z0-9]{6}$/i.test(refCode)) {
                // Update order's affiliateRef in database if missing
                if (order.affiliateRef !== refCode) {
                    order.affiliateRef = refCode;
                    await order.save();
                }

                // Attribute commission & update volunteer Wallet
                await attributeAffiliateCommission(
                    order._id,
                    order.userId,
                    order.courseId,
                    order.amount,
                    refCode
                );

                const volUser = await User.findOne({ affiliateCode: refCode }).select('name').lean();

                repaired.push({
                    orderId: order._id.toString(),
                    volunteerName: volUser?.name || 'Volunteer',
                    affiliateCode: refCode,
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully repaired ${repaired.length} missing volunteer commission(s).`,
            repairedCount: repaired.length,
            details: repaired,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error repairing volunteer commissions:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'REPAIR_FAILED' } },
            { status: 500 }
        );
    }
}
