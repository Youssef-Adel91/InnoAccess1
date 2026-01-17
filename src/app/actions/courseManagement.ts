'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import Category from '@/models/Category';
import { Types } from 'mongoose';

/**
 * Create a new course
 */
export async function createCourse(data: {
    title: string;
    description: string;
    categoryId: string;
    isFree: boolean;
    price?: number;
    thumbnail?: string;
}) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'trainer') {
            throw new Error('Unauthorized - only trainers can create courses');
        }

        await connectDB();

        // Validate category exists
        const category = await Category.findById(data.categoryId);
        if (!category) {
            throw new Error('Invalid category');
        }

        // Validate price for paid courses
        if (!data.isFree && (!data.price || data.price < 0)) {
            throw new Error('Price is required for paid courses');
        }

        // Create course
        const course = await Course.create({
            title: data.title,
            description: data.description,
            categoryId: new Types.ObjectId(data.categoryId),
            trainerId: new Types.ObjectId(session.user.id),
            isFree: data.isFree,
            price: data.isFree ? 0 : (data.price || 0),
            thumbnail: data.thumbnail,
            modules: [],
            enrollmentCount: 0,
            rating: 0,
            isPublished: false,
            isDeleted: false,
        });

        console.log('✅ Course created:', course._id);

        return {
            success: true,
            data: {
                courseId: course._id.toString(),
                message: 'Course created successfully',
            },
        };
    } catch (error: any) {
        console.error('❌ Create course error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to create course',
                code: 'CREATE_COURSE_ERROR',
            },
        };
    }
}

/**
 * Add module to course
 */
export async function addModule(courseId: string, data: {
    title: string;
    description?: string;
    order: number;
}) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'trainer') {
            throw new Error('Unauthorized - only trainers can add modules');
        }

        await connectDB();

        // Find course and verify ownership
        const course = await Course.findById(courseId);

        if (!course) {
            throw new Error('Course not found');
        }

        if (course.trainerId.toString() !== session.user.id) {
            throw new Error('Unauthorized - you can only modify your own courses');
        }

        // Add module
        course.modules.push({
            title: data.title,
            description: data.description,
            videos: [],
            order: data.order,
        } as any);

        await course.save();

        console.log('✅ Module added to course:', courseId);

        // Serialize to avoid circular references
        const addedModule = JSON.parse(JSON.stringify(course.modules[course.modules.length - 1]));

        return {
            success: true,
            data: {
                module: addedModule,
                message: 'Module added successfully',
            },
        };
    } catch (error: any) {
        console.error('❌ Add module error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to add module',
                code: 'ADD_MODULE_ERROR',
            },
        };
    }
}

/**
 * Get trainer's courses
 */
export async function getTrainerCourses() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'trainer') {
            throw new Error('Unauthorized - only trainers can view their courses');
        }

        await connectDB();

        const courses = await Course.find({
            trainerId: session.user.id,
            isDeleted: false,
        })
            .populate('categoryId', 'name slug')
            .sort({ createdAt: -1 })
            .lean();

        return {
            success: true,
            data: {
                courses: JSON.parse(JSON.stringify(courses)),
            },
        };
    } catch (error: any) {
        console.error('❌ Get trainer courses error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to fetch courses',
                code: 'GET_COURSES_ERROR',
            },
        };
    }
}

/**
 * Get single course (with ownership check)
 */
export async function getCourseForManagement(courseId: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'trainer') {
            throw new Error('Unauthorized');
        }

        await connectDB();

        const course = await Course.findById(courseId)
            .populate('categoryId', 'name slug')
            .lean();

        if (!course) {
            throw new Error('Course not found');
        }

        if (course.trainerId.toString() !== session.user.id) {
            throw new Error('Unauthorized - you can only manage your own courses');
        }

        return {
            success: true,
            data: {
                course: JSON.parse(JSON.stringify(course)),
            },
        };
    } catch (error: any) {
        console.error('❌ Get course error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to fetch course',
                code: 'GET_COURSE_ERROR',
            },
        };
    }
}

/**
 * Get all categories
 */
export async function getAllCategories() {
    try {
        await connectDB();

        const categories = await Category.find().sort({ name: 1 }).lean();

        return {
            success: true,
            data: {
                categories: JSON.parse(JSON.stringify(categories)),
            },
        };
    } catch (error: any) {
        console.error('❌ Get categories error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to fetch categories',
                code: 'GET_CATEGORIES_ERROR',
            },
        };
    }
}

/**
 * Publish/Unpublish course
 */
export async function publishCourse(courseId: string, isPublished: boolean) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'trainer') {
            throw new Error('Unauthorized');
        }

        await connectDB();

        const course = await Course.findById(courseId);

        if (!course) {
            throw new Error('Course not found');
        }

        if (course.trainerId.toString() !== session.user.id) {
            throw new Error('Unauthorized - you can only publish your own courses');
        }

        course.isPublished = isPublished;
        await course.save();

        console.log(`✅ Course ${isPublished ? 'published' : 'unpublished'}:`, courseId);

        return {
            success: true,
            data: {
                message: `Course ${isPublished ? 'published' : 'unpublished'} successfully`,
            },
        };
    } catch (error: any) {
        console.error('❌ Publish course error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to publish course',
                code: 'PUBLISH_COURSE_ERROR',
            },
        };
    }
}

/**
 * Delete module from course
 */
export async function deleteModule(courseId: string, moduleIndex: number) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'trainer') {
            throw new Error('Unauthorized');
        }

        await connectDB();

        const course = await Course.findById(courseId);

        if (!course) {
            throw new Error('Course not found');
        }

        if (course.trainerId.toString() !== session.user.id) {
            throw new Error('Unauthorized - you can only modify your own courses');
        }

        if (!course.modules[moduleIndex]) {
            throw new Error('Module not found');
        }

        course.modules.splice(moduleIndex, 1);
        await course.save();

        console.log('✅ Module deleted from course:', courseId);

        return {
            success: true,
            data: {
                message: 'Module deleted successfully',
            },
        };
    } catch (error: any) {
        console.error('❌ Delete module error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to delete module',
                code: 'DELETE_MODULE_ERROR',
            },
        };
    }
}

/**
 * Delete video from module
 */
export async function deleteVideo(courseId: string, moduleIndex: number, videoIndex: number) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'trainer') {
            throw new Error('Unauthorized');
        }

        await connectDB();

        const course = await Course.findById(courseId);

        if (!course) {
            throw new Error('Course not found');
        }

        if (course.trainerId.toString() !== session.user.id) {
            throw new Error('Unauthorized - you can only modify your own courses');
        }

        const module = course.modules[moduleIndex];
        if (!module) {
            throw new Error('Module not found');
        }

        if (!module.videos[videoIndex]) {
            throw new Error('Video not found');
        }

        module.videos.splice(videoIndex, 1);
        await course.save();

        console.log('✅ Video deleted from module');

        return {
            success: true,
            data: {
                message: 'Video deleted successfully',
            },
        };
    } catch (error: any) {
        console.error('❌ Delete video error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to delete video',
                code: 'DELETE_VIDEO_ERROR',
            },
        };
    }
}

/**
 * Update module title/description
 */
export async function updateModule(
    courseId: string,
    moduleIndex: number,
    data: { title?: string; description?: string }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'trainer') {
            throw new Error('Unauthorized');
        }

        await connectDB();

        const course = await Course.findById(courseId);

        if (!course) {
            throw new Error('Course not found');
        }

        if (course.trainerId.toString() !== session.user.id) {
            throw new Error('Unauthorized - you can only modify your own courses');
        }

        const module = course.modules[moduleIndex];
        if (!module) {
            throw new Error('Module not found');
        }

        if (data.title) module.title = data.title;
        if (data.description !== undefined) module.description = data.description;

        await course.save();

        console.log('✅ Module updated');

        return {
            success: true,
            data: {
                message: 'Module updated successfully',
                module: JSON.parse(JSON.stringify(module)),
            },
        };
    } catch (error: any) {
        console.error('❌ Update module error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to update module',
                code: 'UPDATE_MODULE_ERROR',
            },
        };
    }
}
