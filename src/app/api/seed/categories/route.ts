import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Category from '@/models/Category';

/**
 * Seed initial categories
 * Run once: GET /api/seed/categories
 */
export async function GET() {
    try {
        await connectDB();

        const categories = [
            {
                name: 'Technology & Coding',
                slug: 'technology',
                icon: 'code',
                description: 'Programming, software development, and tech skills',
            },
            {
                name: 'Business & Entrepreneurship',
                slug: 'business',
                icon: 'briefcase',
                description: 'Business management, startups, and entrepreneurship',
            },
            {
                name: 'Design & Creative',
                slug: 'design',
                icon: 'pen-tool',
                description: 'Graphic design, UI/UX, and creative arts',
            },
            {
                name: 'Marketing',
                slug: 'marketing',
                icon: 'trending-up',
                description: 'Digital marketing, SEO, and social media',
            },
            {
                name: 'Personal Development',
                slug: 'personal-dev',
                icon: 'user',
                description: 'Self-improvement, productivity, and soft skills',
            },
        ];

        // Clear existing categories and insert new ones
        await Category.deleteMany({});
        const result = await Category.insertMany(categories);

        console.log('✅ Categories seeded successfully:', result.length);

        return NextResponse.json({
            success: true,
            message: `${result.length} categories seeded successfully`,
            data: { categories: result },
        });
    } catch (error: any) {
        console.error('❌ Category seed error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to seed categories',
                    code: 'SEED_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
