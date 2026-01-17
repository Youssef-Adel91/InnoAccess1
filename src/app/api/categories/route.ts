import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Category from '@/models/Category';

/**
 * GET /api/categories
 * Fetch all categories
 */
export async function GET() {
    try {
        await connectDB();

        const categories = await Category.find().sort({ name: 1 }).lean();

        return NextResponse.json({
            success: true,
            data: {
                categories: JSON.parse(JSON.stringify(categories)),
            },
        });
    } catch (error: any) {
        console.error('❌ Get categories error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to fetch categories',
                    code: 'GET_CATEGORIES_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
