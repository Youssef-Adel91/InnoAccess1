import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import Order, { OrderStatus } from '@/models/Order';
import User from '@/models/User';

/**
 * GET /api/admin/orders/revert-status
 *
 * Temporary one-time-use admin route to revert specific completed orders
 * back to PENDING status so they can be re-approved via the new commission system.
 */
export async function GET(req: NextRequest) {
    try {
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

        const targetIds = [
            '6a6bd20bd7e79ffef95e9cb0',
            '6a6bc3d19d666d88d56abee8',
        ];

        const updateResult = await Order.updateMany(
            { _id: { $in: targetIds } },
            { $set: { status: OrderStatus.PENDING } }
        );

        return NextResponse.json({
            success: true,
            message: `Reverted ${updateResult.modifiedCount} order(s) back to PENDING status.`,
            modifiedCount: updateResult.modifiedCount,
            targetIds,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to revert order status';
        console.error('❌ Error reverting orders:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'REVERT_ERROR' } },
            { status: 500 }
        );
    }
}
