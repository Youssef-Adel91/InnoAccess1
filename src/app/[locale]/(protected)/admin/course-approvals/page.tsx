import React from 'react';
import { getTranslations } from 'next-intl/server';
import { connectToDatabase } from '@/lib/db';
import Course, { CourseStatus } from '@/models/Course';
import CourseApprovalClient from './CourseApprovalClient';

export default async function AdminCourseApprovalsPage() {
    const t = await getTranslations('AdminCourseApprovals');

    await connectToDatabase();

    // Fetch courses pending approval
    const coursesDoc = await Course.find({ status: CourseStatus.PENDING_APPROVAL })
        .populate('trainerId', 'name')
        .sort({ createdAt: 1 })
        .lean();

    const courses = coursesDoc.map((course: any) => ({
        _id: course._id.toString(),
        title: course.title,
        trainerName: course.trainerId?.name || 'Unknown',
        createdAt: course.createdAt.toISOString(),
    }));

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('pageTitle')}</h1>
            <CourseApprovalClient courses={courses} />
        </div>
    );
}
