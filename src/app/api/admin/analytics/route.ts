import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';

/**
 * GET /api/admin/analytics
 *
 * Runs 3 parallel MongoDB aggregation pipelines to produce dashboard metrics:
 *
 *   1. rolesDistribution   — count of each UserRole across all registered users
 *   2. dailySignups        — new user registrations per day for the last 30 days
 *                            (returns 30 data points for the sparkline chart)
 *   3. enrollmentSummary   — per-course enrollment counts + revenue estimate
 *                            (top 10 by enrollment count)
 *
 * Caching: ISR with 1-hour revalidation as approved.
 * Auth:    Admin only.
 */
export const revalidate = 3600; // 1-hour ISR cache

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        await connectDB();

        // ── Calculate the 30-day window once ──────────────────────────────────
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        // ── Run all 3 pipelines in parallel ───────────────────────────────────
        const [rolesResult, signupsResult, enrollmentResult] = await Promise.all([

            // Pipeline 1: Roles Distribution
            // Groups all users by role and counts each. Sorts descending.
            User.aggregate([
                {
                    $group: {
                        _id:   '$role',
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                {
                    $project: {
                        _id:   0,
                        role:  '$_id',
                        count: 1,
                    },
                },
            ]),

            // Pipeline 2: Daily Signups (last 30 days)
            // Uses $dateToString to truncate to day granularity.
            // Returns exactly the days that had signups — frontend fills gaps.
            User.aggregate([
                {
                    $match: {
                        createdAt: { $gte: thirtyDaysAgo },
                    },
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date:   '$createdAt',
                            },
                        },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
                {
                    $project: {
                        _id:  0,
                        date:  '$_id',
                        count: 1,
                    },
                },
            ]),

            // Pipeline 3: Course Enrollment Summary
            // Counts live enrollments from the Enrollment collection (source of truth).
            // Joins Course for title + price, filters deleted courses out.
            // Top 10 by enrollment count.
            Enrollment.aggregate([
                {
                    $group: {
                        _id:             '$courseId',
                        enrollmentCount: { $sum: 1 },
                        paidCount:       {
                            $sum: {
                                $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, 1, 0],
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from:         'courses',
                        localField:   '_id',
                        foreignField: '_id',
                        as:           'course',
                        pipeline: [
                            {
                                $match: { isDeleted: { $ne: true } },
                            },
                            {
                                $project: {
                                    title:     1,
                                    price:     1,
                                    isFree:    1,
                                    thumbnail: 1,
                                    courseType: 1,
                                },
                            },
                        ],
                    },
                },
                // Drop enrollments whose course has been deleted (lookup returned empty)
                { $match: { course: { $ne: [] } } },
                { $unwind: '$course' },
                {
                    $project: {
                        _id:             0,
                        courseId:        '$_id',
                        title:           '$course.title',
                        thumbnail:       '$course.thumbnail',
                        courseType:      '$course.courseType',
                        isFree:          '$course.isFree',
                        priceEGP:        { $divide: ['$course.price', 1] }, // price is whole EGP per schema
                        enrollmentCount: 1,
                        paidCount:       1,
                        // Revenue estimate: paidCount × course price
                        revenueEstimate: {
                            $multiply: ['$paidCount', '$course.price'],
                        },
                    },
                },
                { $sort: { enrollmentCount: -1 } },
                { $limit: 10 },
            ]),
        ]);

        // ── Fill in zero-count days for the sparkline ─────────────────────────
        // Build a complete 30-day sequence so the chart always has 30 points.
        const signupMap = new Map<string, number>(
            signupsResult.map((d: { date: string; count: number }) => [d.date, d.count])
        );
        const dailySignups: { date: string; count: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            dailySignups.push({ date: key, count: signupMap.get(key) ?? 0 });
        }

        // ── Compute scalar summary stats ──────────────────────────────────────
        const totalUsers     = (rolesResult as { role: string; count: number }[])
            .reduce((sum, r) => sum + r.count, 0);
        const totalEnrolled  = (enrollmentResult as { enrollmentCount: number }[])
            .reduce((sum, c) => sum + c.enrollmentCount, 0);
        const totalRevenue   = (enrollmentResult as { revenueEstimate: number }[])
            .reduce((sum, c) => sum + c.revenueEstimate, 0);
        const signups30d     = dailySignups.reduce((sum, d) => sum + d.count, 0);

        return NextResponse.json({
            success: true,
            data: {
                summary: {
                    totalUsers,
                    signups30d,
                    totalEnrolled,
                    totalRevenue,
                },
                rolesDistribution: rolesResult,
                dailySignups,
                enrollmentSummary: enrollmentResult,
                generatedAt: new Date().toISOString(),
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Admin analytics error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'ANALYTICS_ERROR' } },
            { status: 500 }
        );
    }
}
