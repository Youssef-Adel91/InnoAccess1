'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { getCourseForManagement, addModule, publishCourse, deleteModule, deleteVideo, updateModule } from '@/app/actions/courseManagement';
import { saveLessonVideo } from '@/app/actions/bunnyUpload';
import { VideoUploader } from '@/components/trainer/VideoUploader';
import LiveCourseManagement from '@/components/trainer/LiveCourseManagement';
import { ArrowLeft, Plus, ChevronDown, ChevronUp, Video, CheckCircle, Clock, XCircle, Trash2, Edit2 } from 'lucide-react';
import Link from 'next/link';

interface Course {
    _id: string;
    title: string;
    description: string;
    categoryId: {
        name: string;
    };
    isFree: boolean;
    price: number;
    thumbnail?: string;
    modules: Module[];
    isPublished: boolean;
    courseType: 'RECORDED' | 'LIVE';
    liveSession?: {
        startDate: string | Date;
        durationMinutes: number;
        zoomMeetingLink: string;
        zoomRecordingLink?: string;
        isRecordingAvailable: boolean;
        instructions?: string;
    };
}

interface Module {
    _id: string;
    title: string;
    description?: string;
    videos: VideoLesson[];
    order: number;
}

interface VideoLesson {
    _id: string;
    title: string;
    bunnyVideoId: string;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    duration: number;
    isFreePreview: boolean;
}

export default function ManageCoursePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const params = useParams();
    const courseId = params.id as string;

    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // UI State
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [showAddModule, setShowAddModule] = useState(false);
    const [showAddLesson, setShowAddLesson] = useState<string | null>(null);

    // Add Module State
    const [newModuleTitle, setNewModuleTitle] = useState('');
    const [addingModule, setAddingModule] = useState(false);

    // Check authorization
    useEffect(() => {
        if (status === 'loading') return;
        if (!session || session.user.role !== 'trainer') {
            router.push('/');
        }
    }, [session, status, router]);

    // Fetch course
    useEffect(() => {
        if (session?.user.role === 'trainer') {
            fetchCourse();
        }
    }, [session, courseId]);

    const fetchCourse = async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await getCourseForManagement(courseId);

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to fetch course');
            }

            setCourse(result.data?.course || null);
            // Expand first module by default
            if (result.data?.course?.modules?.length > 0) {
                setExpandedModules(new Set([result.data.course.modules[0]._id]));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleModule = (moduleId: string) => {
        setExpandedModules((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(moduleId)) {
                newSet.delete(moduleId);
            } else {
                newSet.add(moduleId);
            }
            return newSet;
        });
    };

    const handleAddModule = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingModule(true);
        setError(null);

        try {
            const result = await addModule(courseId, {
                title: newModuleTitle,
                order: (course?.modules.length || 0) + 1,
            });

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to add module');
            }

            // Refresh course
            await fetchCourse();
            setNewModuleTitle('');
            setShowAddModule(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAddingModule(false);
        }
    };

    const handleVideoUploadSuccess = async (data: any, moduleIndex: number) => {
        console.log('Video uploaded successfully:', data);
        setShowAddLesson(null);
        await fetchCourse(); // Refresh to show new lesson
    };

    const handlePublish = async () => {
        if (!course) return;

        setError(null);
        try {
            const result = await publishCourse(courseId, !course.isPublished);

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to publish course');
            }

            await fetchCourse(); // Refresh to update status
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteModule = async (moduleIndex: number) => {
        if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) {
            return;
        }

        setError(null);
        try {
            const result = await deleteModule(courseId, moduleIndex);

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to delete module');
            }

            await fetchCourse();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteVideo = async (moduleIndex: number, videoIndex: number) => {
        if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
            return;
        }

        setError(null);
        try {
            const result = await deleteVideo(courseId, moduleIndex, videoIndex);

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to delete video');
            }

            await fetchCourse();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleEditModule = async (moduleIndex: number) => {
        const module = course?.modules[moduleIndex];
        if (!module) return;

        const newTitle = prompt('Enter new module title:', module.title);
        if (!newTitle || newTitle === module.title) return;

        setError(null);
        try {
            const result = await updateModule(courseId, moduleIndex, { title: newTitle });

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to update module');
            }

            await fetchCourse();
        } catch (err: any) {
            setError(err.message);
        }
    };


    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                    </span>
                );
            case 'pending':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <XCircle className="h-3 w-3 mr-1" />
                        Rejected
                    </span>
                );
            default:
                return null;
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!session || session.user.role !== 'trainer' || !course) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-5xl mx-auto px-4">
                {/* Back Link */}
                <Link
                    href="/trainer/dashboard"
                    className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back to Dashboard
                </Link>

                {/* Course Header */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">{course.title}</h1>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                                    {course.categoryId.name}
                                </span>
                                <span className="font-semibold text-gray-900">
                                    {course.isFree ? 'Free Course' : `$${(course.price / 100).toFixed(2)}`}
                                </span>
                                <span className={`px-3 py-1 rounded-full font-medium ${course.isPublished ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {course.isPublished ? 'Published' : 'Draft'}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handlePublish}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${course.isPublished
                                ? 'bg-gray-600 text-white hover:bg-gray-700'
                                : 'bg-green-600 text-white hover:bg-green-700'
                                }`}
                        >
                            {course.isPublished ? 'Unpublish' : 'Publish Course'}
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Conditional Rendering: LIVE vs RECORDED Course Management */}
                {course.courseType === 'LIVE' ? (
                    /* LIVE Course: Show Zoom Link Management */
                    <LiveCourseManagement course={course} onUpdate={fetchCourse} />
                ) : (
                    /* RECORDED Course: Show Module Management */
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Course Content</h2>
                            <button
                                onClick={() => setShowAddModule(!showAddModule)}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Add Module
                            </button>
                        </div>

                        {/* Add Module Form */}
                        {showAddModule && (
                            <form onSubmit={handleAddModule} className="bg-white rounded-lg shadow-md p-6 mb-4">
                                <h3 className="font-semibold text-gray-900 mb-4">New Module</h3>
                                <input
                                    type="text"
                                    value={newModuleTitle}
                                    onChange={(e) => setNewModuleTitle(e.target.value)}
                                    required
                                    placeholder="Module Title (e.g., Introduction to React)"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModule(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={addingModule}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300"
                                    >
                                        {addingModule ? 'Adding...' : 'Add Module'}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Modules List (Accordion) */}
                        {course.modules.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-md p-12 text-center">
                                <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    No modules yet
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Start by adding your first module
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {course.modules.map((module, moduleIndex) => (
                                    <div key={module._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                                        {/* Module Header */}
                                        <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                                            <button
                                                onClick={() => toggleModule(module._id)}
                                                className="flex-1 flex items-center text-left"
                                            >
                                                <span className="text-sm font-medium text-gray-500 mr-4">
                                                    Module {module.order}
                                                </span>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {module.title}
                                                </h3>
                                                <span className="ml-4 text-sm text-gray-500">
                                                    ({module.videos?.length || 0} lessons)
                                                </span>
                                                <span className="ml-4">
                                                    {expandedModules.has(module._id) ? (
                                                        <ChevronUp className="h-5 w-5 text-gray-500" />
                                                    ) : (
                                                        <ChevronDown className="h-5 w-5 text-gray-500" />
                                                    )}
                                                </span>
                                            </button>

                                            {/* Module Actions */}
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleEditModule(moduleIndex)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Edit module"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteModule(moduleIndex)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete module"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Module Content (Expandable) */}
                                        {expandedModules.has(module._id) && (
                                            <div className="px-6 pb-6 border-t">
                                                {/* Lessons List */}
                                                {module.videos && module.videos.length > 0 && (
                                                    <div className="mt-4 space-y-3">
                                                        {module.videos.map((video, videoIndex) => (
                                                            <div
                                                                key={video._id}
                                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                                            >
                                                                <div className="flex items-center flex-1">
                                                                    <Video className="h-5 w-5 text-gray-400 mr-3" />
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-gray-900">
                                                                            {video.title}
                                                                        </p>
                                                                        <p className="text-sm text-gray-600">
                                                                            {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')} min
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center space-x-3">
                                                                    {video.isFreePreview && (
                                                                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                                                                            Free Preview
                                                                        </span>
                                                                    )}
                                                                    {getStatusBadge(video.status)}
                                                                    {video.status === 'rejected' && video.rejectionReason && (
                                                                        <p className="text-sm text-red-600">
                                                                            {video.rejectionReason}
                                                                        </p>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleDeleteVideo(moduleIndex, videoIndex)}
                                                                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                        title="Delete video"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Add Lesson Button */}
                                                <button
                                                    onClick={() => setShowAddLesson(module._id)}
                                                    className="mt-4 w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
                                                >
                                                    + Add Lesson
                                                </button>

                                                {/* Video Uploader Modal */}
                                                {showAddLesson === module._id && (
                                                    <div className="mt-4 p-6 bg-blue-50 border border-blue-200 rounded-lg">
                                                        <h4 className="font-semibold text-gray-900 mb-4">
                                                            Upload New Lesson
                                                        </h4>

                                                        {/* Free Preview Checkbox (only for paid courses) */}
                                                        {!course.isFree && (
                                                            <div className="mb-4 p-4 bg-white rounded-lg">
                                                                <label className="flex items-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        id={`freePreview-${module._id}`}
                                                                        className="h-4 w-4 text-blue-600 rounded"
                                                                    />
                                                                    <span className="ml-3 text-sm text-gray-700">
                                                                        <strong>Make this a free preview</strong>
                                                                        <br />
                                                                        <span className="text-gray-600">
                                                                            Non-enrolled students can watch this lesson
                                                                        </span>
                                                                    </span>
                                                                </label>
                                                            </div>
                                                        )}

                                                        <VideoUploader
                                                            courseId={courseId}
                                                            moduleIndex={moduleIndex}
                                                            onSuccess={(data) => handleVideoUploadSuccess(data, moduleIndex)}
                                                            isFreePreview={
                                                                course.isFree
                                                                    ? false
                                                                    : (document.getElementById(`freePreview-${module._id}`) as HTMLInputElement)?.checked || false
                                                            }
                                                        />

                                                        <button
                                                            onClick={() => setShowAddLesson(null)}
                                                            className="mt-4 text-sm text-gray-600 hover:text-gray-900"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
