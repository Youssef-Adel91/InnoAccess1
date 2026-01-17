'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';
import Category from '@/models/Category';
import { Types } from 'mongoose';

/**
 * Enroll in a free course
 */
export async function enrollInCourse(courseId: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            throw new Error('You must be logged in to enroll');
        }

        await connectDB();

        // Check if course exists and is free
        const course = await Course.findById(courseId);

        if (!course) {
            throw new Error('Course not found');
        }

        if (!course.isPublished) {
            throw new Error('Course is not available');
        }

        if (!course.isFree) {
            throw new Error('This course requires payment');
        }

        // Check if already enrolled
        const existingEnrollment = await Enrollment.findOne({
            userId: session.user.id,
            courseId: courseId,
        });

        if (existingEnrollment) {
            return {
                success: true,
                data: {
                    message: 'Already enrolled',
                    enrollment: JSON.parse(JSON.stringify(existingEnrollment)),
                },
            };
        }

        // Create enrollment
        const enrollment = await Enrollment.create({
            userId: new Types.ObjectId(session.user.id),
            courseId: new Types.ObjectId(courseId),
            progress: [],
            enrolledAt: new Date(),
        });

        // Update course enrollment count
        await Course.findByIdAndUpdate(courseId, {
            $inc: { enrollmentCount: 1 },
        });

        console.log('✅ Student enrolled in course:', courseId);

        return {
            success: true,
            data: {
                message: 'Enrolled successfully!',
                enrollment: JSON.parse(JSON.stringify(enrollment)),
            },
        };
    } catch (error: any) {
        console.error('❌ Enrollment error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to enroll',
                code: 'ENROLLMENT_ERROR',
            },
        };
    }
}

/**
 * Check if user is enrolled in a course
 */
export async function checkEnrollment(courseId: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return {
                success: true,
                data: {
                    isEnrolled: false,
                },
            };
        }

        await connectDB();

        const enrollment = await Enrollment.findOne({
            userId: session.user.id,
            courseId: courseId,
        });

        return {
            success: true,
            data: {
                isEnrolled: !!enrollment,
                enrollment: enrollment ? JSON.parse(JSON.stringify(enrollment)) : null,
            },
        };
    } catch (error: any) {
        console.error('❌ Check enrollment error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to check enrollment',
                code: 'CHECK_ENROLLMENT_ERROR',
            },
        };
    }
}
