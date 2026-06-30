import React from 'react';
import { connectDB } from '@/lib/db';
import Course, { CourseStatus } from '@/models/Course';
import CourseApprovalClient from './CourseApprovalClient';

/** Never cache — always show the real-time pending queue */
export const dynamic = 'force-dynamic';

export default async function AdminCourseApprovalsPage() {
    await connectDB();

    // Fetch courses pending approval — status is the canonical field, no isPublished filter
    const coursesDoc = await Course.find({ status: CourseStatus.PENDING_APPROVAL })
        .populate('trainerId', 'name')
        .sort({ createdAt: 1 })
        .lean();

    const courses = coursesDoc.map((course: any) => ({
        _id:         course._id.toString(),
        title:       course.title,
        trainerName: course.trainerId?.name || 'Unknown Trainer',
        createdAt:   course.createdAt.toISOString(),
    }));

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Course Approvals</h1>
                    <p className="mt-2 text-gray-600">
                        موافقات الكورسات — Review and publish trainer-submitted courses.
                    </p>
                </div>
                <CourseApprovalClient courses={courses} />
            </div>
        </div>
    );
}
