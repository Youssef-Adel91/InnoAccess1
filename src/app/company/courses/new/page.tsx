'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { createCourse, getAllCategories } from '@/app/actions/courseManagement';
import { CourseType } from '@/types/course';
import { ArrowLeft, Upload, DollarSign, Video, Calendar } from 'lucide-react';
import Link from 'next/link';

interface Category {
    _id: string;
    name: string;
    slug: string;
}

export default function CompanyCreateCoursePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [isFree, setIsFree] = useState(false);
    const [price, setPrice] = useState('');
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState('');
    const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
    const [courseType, setCourseType] = useState<CourseType>(CourseType.RECORDED);
    const [liveSession, setLiveSession] = useState({
        startDate: '',
        durationMinutes: 60,
        zoomMeetingLink: '',
        instructions: '',
    });
    const [allowedRoles, setAllowedRoles] = useState<string[]>(['user', 'company', 'trainer', 'admin', 'volunteer']);

    const handleRoleToggle = (role: string) => {
        setAllowedRoles(prev => 
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    useEffect(() => {
        if (status === 'loading') return;
        if (!session || session.user.role !== 'company') router.push('/');
    }, [session, status, router]);

    useEffect(() => {
        getAllCategories().then((r) => {
            if (r.success) setCategories(r.data?.categories || []);
        });
    }, []);

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
        if (file.size > 10 * 1024 * 1024) { setError('Image must be less than 10MB'); return; }
        setThumbnailFile(file);
        setThumbnailPreview(URL.createObjectURL(file));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            let thumbnailUrl = '';
            if (thumbnailFile) {
                setUploadingThumbnail(true);
                // Upload directly from browser to Cloudinary (no server involved)
                // Uses an unsigned upload preset — zero Vercel body-size limits.
                const fd = new FormData();
                fd.append('file', thumbnailFile);
                fd.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
                fd.append('folder', 'course-thumbnails');

                const cloudRes = await fetch(
                    `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
                    { method: 'POST', body: fd }
                );
                if (!cloudRes.ok) {
                    throw new Error('Thumbnail upload failed. Please try again.');
                }
                const cloudData = await cloudRes.json();
                thumbnailUrl = cloudData.secure_url;
                setUploadingThumbnail(false);
            }

            const result = await createCourse({
                title,
                description,
                categoryId,
                isFree,
                price: isFree ? 0 : Math.round(parseFloat(price) * 100),
                thumbnail: thumbnailUrl,
                courseType,
                liveSession: courseType === CourseType.LIVE ? liveSession : undefined,
                allowedRoles,
            });

            if (!result.success) throw new Error(result.error?.message || 'Failed to create course');

            // Redirect to the shared trainer manage page (works for any creator)
            router.push(`/trainer/courses/${result.data?.courseId}/manage`);
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
            setUploadingThumbnail(false);
        }
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!session || session.user.role !== 'company') return null;

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto px-4">
                <Link href="/company/courses" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
                    <ArrowLeft className="h-5 w-5 mr-2" aria-hidden="true" />
                    Back to My Courses
                </Link>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Create New Course</h1>
                    <p className="mt-2 text-gray-600">Fill in the details below to publish a course for your audience</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8 space-y-6">

                    {/* Title */}
                    <div>
                        <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 mb-1">
                            Course Title <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="course-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="e.g., Workplace Inclusion Fundamentals"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="course-description" className="block text-sm font-medium text-gray-700 mb-1">
                            Description <span aria-hidden="true">*</span>
                        </label>
                        <textarea
                            id="course-description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            rows={5}
                            placeholder="Describe what students will learn…"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label htmlFor="course-category" className="block text-sm font-medium text-gray-700 mb-1">
                            Category <span aria-hidden="true">*</span>
                        </label>
                        <select
                            id="course-category"
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select a category</option>
                            {categories.map((cat) => (
                                <option key={cat._id} value={cat._id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Course Type */}
                    <div>
                        <p className="block text-sm font-medium text-gray-700 mb-2">Course Type <span aria-hidden="true">*</span></p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setCourseType(CourseType.RECORDED)}
                                className={`p-4 border-2 rounded-lg transition-colors text-left ${courseType === CourseType.RECORDED ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                                aria-pressed={courseType === CourseType.RECORDED}
                            >
                                <div className="flex items-center mb-1">
                                    <Video className="h-7 w-7 text-blue-600 mr-2" aria-hidden="true" />
                                    <p className="font-semibold text-gray-900">Recorded Course</p>
                                </div>
                                <p className="text-sm text-gray-500">Upload video lessons for on-demand learning</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => setCourseType(CourseType.LIVE)}
                                className={`p-4 border-2 rounded-lg transition-colors text-left ${courseType === CourseType.LIVE ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
                                aria-pressed={courseType === CourseType.LIVE}
                            >
                                <div className="flex items-center mb-1">
                                    <Calendar className="h-7 w-7 text-red-500 mr-2" aria-hidden="true" />
                                    <p className="font-semibold text-gray-900">Live Zoom Workshop</p>
                                </div>
                                <p className="text-sm text-gray-500">Schedule a live Zoom session</p>
                            </button>
                        </div>
                    </div>

                    {/* Live session fields */}
                    {courseType === CourseType.LIVE && (
                        <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                            <h3 className="font-semibold text-gray-900">🔴 Live Workshop Details</h3>
                            <div>
                                <label htmlFor="live-date" className="block text-sm font-medium text-gray-700 mb-1">Workshop Date &amp; Time *</label>
                                <input id="live-date" type="datetime-local" value={liveSession.startDate}
                                    onChange={(e) => setLiveSession({ ...liveSession, startDate: e.target.value })}
                                    required={courseType === CourseType.LIVE}
                                    min={new Date().toISOString().slice(0, 16)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label htmlFor="live-duration" className="block text-sm font-medium text-gray-700 mb-1">Duration *</label>
                                <select id="live-duration" value={liveSession.durationMinutes}
                                    onChange={(e) => setLiveSession({ ...liveSession, durationMinutes: parseInt(e.target.value) })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                    {[30, 60, 90, 120, 180, 240].map(m => <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} hr${m > 60 ? 's' : ''}`}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="live-zoom" className="block text-sm font-medium text-gray-700 mb-1">Zoom Link *</label>
                                <input id="live-zoom" type="url" value={liveSession.zoomMeetingLink}
                                    onChange={(e) => setLiveSession({ ...liveSession, zoomMeetingLink: e.target.value })}
                                    required={courseType === CourseType.LIVE}
                                    placeholder="https://zoom.us/j/..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label htmlFor="live-instructions" className="block text-sm font-medium text-gray-700 mb-1">Instructions (optional)</label>
                                <textarea id="live-instructions" value={liveSession.instructions}
                                    onChange={(e) => setLiveSession({ ...liveSession, instructions: e.target.value })}
                                    rows={3} placeholder="Pre-session requirements…"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    )}

                    {/* Allowed Roles */}
                    <div>
                        <p className="block text-sm font-medium text-gray-700 mb-2">Allowed Roles (RBAC) *</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {['user', 'company', 'trainer', 'admin', 'volunteer'].map(role => (
                                <label key={role} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input 
                                        type="checkbox" 
                                        checked={allowedRoles.includes(role)}
                                        onChange={() => handleRoleToggle(role)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-900 capitalize">{role}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Pricing */}
                    <div>
                        <p className="block text-sm font-medium text-gray-700 mb-2">Pricing *</p>
                        <div className="space-y-2">
                            {[{ label: 'Free Course', sub: 'Open to all students at no cost', value: true }, { label: 'Paid Course', sub: 'Students pay to enroll', value: false }].map(({ label, sub, value }) => (
                                <label key={label} className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input type="radio" name="pricing" checked={isFree === value} onChange={() => setIsFree(value)} className="h-4 w-4 text-blue-600" />
                                    <div className="ml-3">
                                        <p className="font-medium text-gray-900">{label}</p>
                                        <p className="text-sm text-gray-500">{sub}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Price input */}
                    {!isFree && (
                        <div>
                            <label htmlFor="course-price" className="block text-sm font-medium text-gray-700 mb-1">Price (USD) *</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <DollarSign className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input id="course-price" type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                                    required={!isFree} min="0" step="0.01" placeholder="49.99"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                    )}

                    {/* Thumbnail */}
                    <div>
                        <p className="block text-sm font-medium text-gray-700 mb-1">Course Thumbnail (Recommended)</p>
                        <div className="flex items-center space-x-4">
                            <label className="flex-1 flex flex-col items-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition">
                                <Upload className="h-8 w-8 text-gray-400 mb-2" aria-hidden="true" />
                                <span className="text-sm text-gray-600">{thumbnailFile ? thumbnailFile.name : 'Click to upload image'}</span>
                                <span className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 10MB</span>
                                <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                            </label>
                            {thumbnailPreview && (
                                <div className="w-28 h-28 rounded-lg overflow-hidden border border-gray-200">
                                    <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end space-x-4 pt-2">
                        <Link href="/company/courses" className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            Cancel
                        </Link>
                        <button type="submit" disabled={loading || uploadingThumbnail}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {uploadingThumbnail ? 'Uploading…' : loading ? 'Creating…' : 'Create Course'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
