import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import { generateAffiliateCode } from '@/lib/affiliateUtils';

/**
 * GET /api/volunteer/affiliate-code
 *
 * Returns the volunteer's existing affiliate code, or generates a new one
 * lazily on first call. This "lazy generation" pattern means:
 *   - No codes are wasted on volunteers who never use the affiliate feature
 *   - The code generation is atomic thanks to MongoDB's unique sparse index
 *
 * Auth: Volunteer role only.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
                { status: 401 }
            );
        }

        if (session.user.role !== 'volunteer') {
            return NextResponse.json(
                { success: false, error: { message: 'Volunteers only', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        await connectDB();

        const user = await User.findById(session.user.id).select('affiliateCode affiliateCodeGeneratedAt');

        if (!user) {
            return NextResponse.json(
                { success: false, error: { message: 'User not found', code: 'NOT_FOUND' } },
                { status: 404 }
            );
        }

        // ── Fast path: code already exists ───────────────────────────────────
        if (user.affiliateCode) {
            return NextResponse.json({
                success: true,
                data: {
                    affiliateCode:          user.affiliateCode,
                    affiliateCodeGeneratedAt: user.affiliateCodeGeneratedAt,
                    isNew: false,
                },
            });
        }

        // ── Slow path: generate a new unique code ─────────────────────────────
        // Retry up to 5 times to handle the astronomically rare collision on the
        // unique sparse index (36^6 ≈ 2.18 billion possibilities).
        let code = '';
        let saved = false;

        for (let attempt = 1; attempt <= 5; attempt++) {
            code = generateAffiliateCode();
            try {
                await User.findByIdAndUpdate(
                    session.user.id,
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
                // MongoDB duplicate key error code
                const isE11000 = (indexError as { code?: number }).code === 11000;
                if (isE11000 && attempt < 5) {
                    console.warn(`⚠️ Affiliate code collision on attempt ${attempt}, retrying...`);
                    continue;
                }
                throw indexError; // Non-collision error — re-throw
            }
        }

        if (!saved) {
            throw new Error('Failed to generate a unique affiliate code after 5 attempts');
        }

        console.log(`✅ Affiliate code generated for volunteer ${session.user.id}: ${code}`);

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
