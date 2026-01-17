'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { createCourse, getAllCategories } from '@/app/actions/courseManagement';
import { uploadCourseThumbnail } from '@/app/actions/uploadCourseThumbnail';
import { ArrowLeft, Upload, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface Category {
    _id: string;
    name: string;
    slug: string;
}

export default function CreateCoursePage() {
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

    // Check authorization
    useEffect(() => {
        if (status === 'loading') return;
        if (!session || session.user.role !== 'trainer') {
            router.push('/');
        }
    }, [session, status, router]);

    // Fetch categories
    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const result = await getAllCategories();
        if (result.success) {
            setCategories(result.data?.categories || []);
        }
    };

    const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('Image size must be less than 2MB');
            return;
        }

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

            // Upload thumbnail if selected
            if (thumbnailFile) {
                setUploadingThumbnail(true);

                // Create FormData for server action
                const formData = new FormData();
                formData.append('thumbnail', thumbnailFile);

                const uploadResult = await uploadCourseThumbnail(formData);

                if (!uploadResult.success) {
                    throw new Error(uploadResult.error?.message || 'Failed to upload thumbnail');
                }

                thumbnailUrl = uploadResult.data?.url || '';
                setUploadingThumbnail(false);
            }

            // Create course
            const result = await createCourse({
                title,
                description,
                categoryId,
                isFree,
                price: isFree ? 0 : Math.round(parseFloat(price) * 100), // Convert to cents
                thumbnail: thumbnailUrl,
            });

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to create course');
            }

            console.log('✅ Course created successfully');

            // Redirect to manage page
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
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!session || session.user.role !== 'trainer') {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto px-4">
                {/* Back Link */}
                <Link
                    href="/trainer/dashboard"
                    className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Back to Dashboard
                </Link>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Create New Course</h1>
                    <p className="mt-2 text-gray-600">
                        Fill in the details below to create your course
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
                    {/* Course Title */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Course Title *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            placeholder="e.g., Complete Web Development Bootcamp"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Description */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description *
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            required
                            rows={5}
                            placeholder="Describe what students will learn in this course..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Category */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category *
                        </label>
                        <select
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Select a category</option>
                            {categories.map((cat) => (
                                <option key={cat._id} value={cat._id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Pricing Type */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Pricing *
                        </label>
                        <div className="space-y-3">
                            <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="pricing"
                                    checked={isFree}
                                    onChange={() => setIsFree(true)}
                                    className="h-4 w-4 text-blue-600"
                                />
                                <div className="ml-3">
                                    <p className="font-medium text-gray-900">Free Course</p>
                                    <p className="text-sm text-gray-600">
                                        All students can access for free
                                    </p>
                                </div>
                            </label>

                            <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="pricing"
                                    checked={!isFree}
                                    onChange={() => setIsFree(false)}
                                    className="h-4 w-4 text-blue-600"
                                />
                                <div className="ml-3">
                                    <p className="font-medium text-gray-900">Paid Course</p>
                                    <p className="text-sm text-gray-600">
                                        Students pay to enroll
                                    </p>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Price (show only if paid) */}
                    {!isFree && (
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Price (USD) *
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <DollarSign className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    required={!isFree}
                                    min="0"
                                    step="0.01"
                                    placeholder="49.99"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}

                    {/* Thumbnail */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Course Thumbnail (Recommended)
                        </label>
                        <div className="flex items-center space-x-4">
                            <label className="flex-1 flex flex-col items-center px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition">
                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-600">
                                    {thumbnailFile ? thumbnailFile.name : 'Click to upload image'}
                                </span>
                                <span className="text-xs text-gray-500 mt-1">
                                    PNG, JPG up to 2MB
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleThumbnailChange}
                                    className="hidden"
                                />
                            </label>

                            {thumbnailPreview && (
                                <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-300">
                                    <img
                                        src={thumbnailPreview}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end space-x-4">
                        <Link
                            href="/trainer/dashboard"
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading || uploadingThumbnail}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {uploadingThumbnail
                                ? 'Uploading Thumbnail...'
                                : loading
                                    ? 'Creating Course...'
                                    : 'Create Course'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
