import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';

/**
 * GET /api/admin/courses/intelligence
 *
 * Course intelligence table for admins. Single aggregation pipeline:
 *
 *   Course
 *     → $lookup → enrollments  (count live enrollments, sum revenue)
 *     → $lookup → users        (trainer name via Course.trainerId)
 *     → $lookup → trainerprofiles (trainer specialization, cvUrl)
 *
 * Fields returned per course:
 *   courseId, title, thumbnail, courseType, isFree, price
 *   isPublished, isDeleted, createdAt
 *   enrollmentCount (live from Enrollment collection)
 *   paidEnrollments (count of PAID enrollments)
 *   revenueEstimate (paidEnrollments × price)
 *   trainerName, trainerEmail, trainerAvatar
 *   trainerSpecialization, trainerCvUrl
 *
 * Sorted by enrollmentCount desc by default.
 *
 * Query params:
 *   ?published=true|false  (optional)
 *   ?page=1  &limit=20
 *
 * Auth: Admin only.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Admin access required', code: 'FORBIDDEN' } },
                { status: 403 }
            );
        }

        await connectDB();

        const { searchParams } = new URL(req.url);
        const page      = Math.max(1, parseInt(searchParams.get('page')  ?? '1',  10));
        const limit     = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
        const skip      = (page - 1) * limit;
        const published = searchParams.get('published');

        // Build the initial match: always exclude soft-deleted courses
        const matchStage: Record<string, unknown> = { isDeleted: { $ne: true } };
        if (published === 'true')  matchStage.isPublished = true;
        if (published === 'false') matchStage.isPublished = false;

        const [courses, total] = await Promise.all([
            Course.aggregate([
                { $match: matchStage },
                { $sort:  { enrollmentCount: -1, createdAt: -1 } },
                { $skip:  skip  },
                { $limit: limit },

                // ── Join 1: Live enrollment count from Enrollment collection ──────
                // Using a correlated sub-pipeline so we can $count without a
                // secondary $group stage — much cleaner than a full facet.
                {
                    $lookup: {
                        from:     'enrollments',
                        let:      { courseId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$courseId', '$$courseId'] },
                                },
                            },
                            {
                                $group: {
                                    _id:         null,
                                    total:       { $sum: 1 },
                                    paidCount:   {
                                        $sum: {
                                            $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, 1, 0],
                                        },
                                    },
                                },
                            },
                            {
                                $project: { _id: 0, total: 1, paidCount: 1 },
                            },
                        ],
                        as: 'enrollmentStats',
                    },
                },

                // ── Join 2: Trainer user record (name, email, avatar) ─────────────
                {
                    $lookup: {
                        from:         'users',
                        localField:   'trainerId',
                        foreignField: '_id',
                        as:           'trainer',
                        pipeline: [
                            {
                                $project: {
                                    name:             1,
                                    email:            1,
                                    'profile.avatar': 1,
                                },
                            },
                        ],
                    },
                },
                { $unwind: { path: '$trainer', preserveNullAndEmpty: true } },

                // ── Join 3: TrainerProfile (specialization, cvUrl) ────────────────
                {
                    $lookup: {
                        from:         'trainerprofiles',
                        localField:   'trainerId',
                        foreignField: 'userId',
                        as:           'trainerProfile',
                        pipeline: [
                            {
                                $project: {
                                    specialization: 1,
                                    cvUrl:          1,
                                    status:         1,
                                },
                            },
                        ],
                    },
                },
                { $unwind: { path: '$trainerProfile', preserveNullAndEmpty: true } },

                // ── Final projection ─────────────────────────────────────────────
                {
                    $project: {
                        _id:           0,
                        courseId:      '$_id',
                        title:         1,
                        thumbnail:     1,
                        courseType:    1,
                        isFree:        1,
                        price:         1,
                        isPublished:   1,
                        createdAt:     1,

                        // Live enrollment count (from Enrollment collection)
                        liveEnrollmentCount: {
                            $ifNull: [
                                { $arrayElemAt: ['$enrollmentStats.total', 0] },
                                0,
                            ],
                        },
                        // Cached count stored on the Course doc itself (for reference)
                        cachedEnrollmentCount: '$enrollmentCount',

                        paidEnrollments: {
                            $ifNull: [
                                { $arrayElemAt: ['$enrollmentStats.paidCount', 0] },
                                0,
                            ],
                        },
                        // Revenue estimate: paidEnrollments × price (in EGP)
                        revenueEstimate: {
                            $multiply: [
                                {
                                    $ifNull: [
                                        { $arrayElemAt: ['$enrollmentStats.paidCount', 0] },
                                        0,
                                    ],
                                },
                                '$price',
                            ],
                        },

                        // Trainer fields (flattened)
                        trainerName:           '$trainer.name',
                        trainerEmail:          '$trainer.email',
                        trainerAvatar:         '$trainer.profile.avatar',
                        trainerSpecialization: '$trainerProfile.specialization',
                        trainerCvUrl:          '$trainerProfile.cvUrl',
                        trainerStatus:         '$trainerProfile.status',
                    },
                },
            ]),

            Course.countDocuments(matchStage),
        ]);

        // ── Summary totals ─────────────────────────────────────────────────────
        const totalRevenue      = (courses as { revenueEstimate: number }[])
            .reduce((s, c) => s + c.revenueEstimate, 0);
        const totalEnrollments  = (courses as { liveEnrollmentCount: number }[])
            .reduce((s, c) => s + c.liveEnrollmentCount, 0);

        return NextResponse.json({
            success: true,
            data: {
                courses,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
                totals: {
                    revenue:     totalRevenue,
                    enrollments: totalEnrollments,
                    courses:     total,
                },
            },
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('❌ Course intelligence error:', error);
        return NextResponse.json(
            { success: false, error: { message, code: 'COURSE_INTELLIGENCE_ERROR' } },
            { status: 500 }
        );
    }
}
