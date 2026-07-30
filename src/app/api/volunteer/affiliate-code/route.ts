import { NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { generateAffiliateCode } from '@/lib/affiliateUtils';

/**
 * GET /api/volunteer/affiliate-code
 *
 * Returns the volunteer's existing affiliate code, or generates a new one
 * lazily on first call.
 *
 * Auth: Volunteer role only (using Clerk currentUser).
 */
export async function GET() {
    try {
        const clerkUser = await currentUser();

        if (!clerkUser) {
            return NextResponse.json(
                { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().trim();
        await connectDB();

        const user = await User.findOne({ email }).select('_id role affiliateCode affiliateCodeGeneratedAt');

        if (!user) {
            return NextResponse.json(
                { success: false, error: { message: 'User not found', code: 'NOT_FOUND' } },
                { status: 404 }
            );
        }

        if (user.role !== 'volunteer' && user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Volunteers only', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        // ── Fast path: code already exists ───────────────────────────────────
        if (user.affiliateCode) {
            return NextResponse.json({
                success: true,
                data: {
                    affiliateCode:            user.affiliateCode,
                    affiliateCodeGeneratedAt: user.affiliateCodeGeneratedAt,
                    isNew: false,
                },
            });
        }

        // ── Slow path: generate a new unique code ─────────────────────────────
        let code = '';
        let saved = false;
        const userId = user._id;

        for (let attempt = 1; attempt <= 5; attempt++) {
            code = generateAffiliateCode();
            try {
                await User.findByIdAndUpdate(
                    userId,
                    {
                        $set: {
                            affiliateCode:            code,
                            affiliateCodeGeneratedAt: new Date(),
                        },
                    },
                    { new: true }
                );
                saved = true;
                break;
            } catch (indexError: unknown) {
                const isE11000 = (indexError as { code?: number }).code === 11000;
                if (isE11000 && attempt < 5) {
                    console.warn(`⚠️ Affiliate code collision on attempt ${attempt}, retrying...`);
                    continue;
                }
                throw indexError;
            }
        }

        if (!saved) {
            throw new Error('Failed to generate a unique affiliate code after 5 attempts');
        }

        console.log(`✅ Affiliate code generated for volunteer ${userId}: ${code}`);

        return NextResponse.json({
            success: true,
            data: {
                affiliateCode:            code,
                affiliateCodeGeneratedAt: new Date(),
                isNew: true,
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Affiliate code generation error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'AFFILIATE_CODE_ERROR' } },
            { status: 500 }
        );
    }
}
