'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Upload } from 'lucide-react';

interface JobFormData {
    title: string;
    description: string;
    requirements: string;
    location: 'remote' | 'onsite' | 'hybrid';
    jobType: 'full-time' | 'part-time' | 'internship';
    salaryMin: string;
    salaryMax: string;
    contactEmail: string;
    contactPhone: string;
    companyLogo: string;
}

interface JobPostFormProps {
    initialData?: any; // Job data for edit mode
    jobId?: string; // If editing
}

export default function JobPostForm({ initialData, jobId }: JobPostFormProps) {
    const router = useRouter();
    const isEditMode = !!jobId;

    const [formData, setFormData] = useState<JobFormData>({
        title: initialData?.title || '',
        description: initialData?.description || '',
        requirements: initialData?.requirements?.join('\n') || '',
        location: initialData?.type || 'onsite',
        jobType: initialData?.jobType || 'full-time',
        salaryMin: initialData?.salary?.min?.toString() || '',
        salaryMax: initialData?.salary?.max?.toString() || '',
        contactEmail: initialData?.contactEmail || '',
        contactPhone: initialData?.contactPhone || '',
        companyLogo: initialData?.companyLogo || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const handleUploadImage = async (file: File) => {
        // Check if Cloudinary is configured
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            setErrors(prev => ({
                ...prev,
                companyLogo: 'Cloudinary is not configured. Please add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to your .env.local file or skip logo upload.'
            }));
            return;
        }

        setUploadingImage(true);
        setErrors(prev => ({ ...prev, companyLogo: '' }));

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', uploadPreset);

            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            const data = await response.json();
            if (data.secure_url) {
                setFormData(prev => ({ ...prev, companyLogo: data.secure_url }));
            } else {
                setErrors(prev => ({ ...prev, companyLogo: 'Failed to upload image' }));
            }
        } catch (error) {
            console.error('Upload error:', error);
            setErrors(prev => ({ ...prev, companyLogo: 'Failed to upload image' }));
        } finally {
            setUploadingImage(false);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.title || formData.title.length < 5) {
            newErrors.title = 'Title must be at least 5 characters';
        }

        if (!formData.description || formData.description.length < 50) {
            newErrors.description = 'Description must be at least 50 characters';
        }

        if (!formData.requirements || formData.requirements.trim().length === 0) {
            newErrors.requirements = 'At least one requirement is needed';
        }

        if (!formData.contactEmail || !/^\S+@\S+\.\S+$/.test(formData.contactEmail)) {
            newErrors.contactEmail = 'Valid contact email is required';
        }

        const min = parseFloat(formData.salaryMin);
        const max = parseFloat(formData.salaryMax);

        if (isNaN(min) || min < 0) {
            newErrors.salaryMin = 'Valid minimum salary required';
        }

        if (isNaN(max) || max < 0) {
            newErrors.salaryMax = 'Valid maximum salary required';
        }

        if (!isNaN(min) && !isNaN(max) && max < min) {
            newErrors.salaryMax = 'Maximum salary must be greater than or equal to minimum';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (status: 'published' | 'draft') => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const endpoint = isEditMode ? `/api/company/jobs/${jobId}` : '/api/company/jobs';
            const method = isEditMode ? 'PATCH' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    requirements: formData.requirements.split('\n').filter(r => r.trim()),
                    location: formData.location,
                    jobType: formData.jobType,
                    salary: {
                        min: parseFloat(formData.salaryMin),
                        max: parseFloat(formData.salaryMax),
                        currency: 'EGP',
                    },
                    contactEmail: formData.contactEmail,
                    contactPhone: formData.contactPhone || undefined,
                    companyLogo: formData.companyLogo || undefined,
                    status,
                }),
            });

            const data = await response.json();

            if (data.success) {
                alert(isEditMode ? 'Job updated successfully!' : data.data.message);
                router.push('/company/jobs');
            } else {
                setErrors({ submit: data.error?.message || `Failed to ${isEditMode ? 'update' : 'create'} job` });
            }
        } catch (error) {
            console.error('Submit error:', error);
            setErrors({ submit: `An error occurred while ${isEditMode ? 'updating' : 'creating'} the job` });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    {isEditMode ? 'Edit Job Posting' : 'Job Posting'}
                </h2>

                {errors.submit && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{errors.submit}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Form Fields */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Job Title */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                                Job Title *
                            </label>
                            <input
                                type="text"
                                id="title"
                                value={formData.title}
                                onChange={(e) => {
                                    setFormData({ ...formData, title: e.target.value });
                                    setErrors(prev => ({ ...prev, title: '' }));
                                }}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-required="true"
                                aria-invalid={!!errors.title}
                                aria-describedby={errors.title ? 'title-error' : undefined}
                            />
                            {errors.title && (
                                <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
                                    {errors.title}
                                </p>
                            )}
                        </div>

                        {/* Job Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                Job Description *
                            </label>
                            <textarea
                                id="description"
                                rows={4}
                                value={formData.description}
                                onChange={(e) => {
                                    setFormData({ ...formData, description: e.target.value });
                                    setErrors(prev => ({ ...prev, description: '' }));
                                }}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Describe the role, responsibilities, and what makes this opportunity great..."
                                aria-required="true"
                                aria-invalid={!!errors.description}
                                aria-describedby={errors.description ? 'description-error' : undefined}
                            />
                            {errors.description && (
                                <p id="description-error" className="mt-1 text-sm text-red-600" role="alert">
                                    {errors.description}
                                </p>
                            )}
                        </div>

                        {/* Requirements */}
                        <div>
                            <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-1">
                                Requirements * (one per line)
                            </label>
                            <textarea
                                id="requirements"
                                rows={4}
                                value={formData.requirements}
                                onChange={(e) => {
                                    setFormData({ ...formData, requirements: e.target.value });
                                    setErrors(prev => ({ ...prev, requirements: '' }));
                                }}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="2+ years experience&#10;Bachelor's degree&#10;Strong communication skills"
                                aria-required="true"
                                aria-invalid={!!errors.requirements}
                                aria-describedby={errors.requirements ? 'requirements-error' : undefined}
                            />
                            {errors.requirements && (
                                <p id="requirements-error" className="mt-1 text-sm text-red-600" role="alert">
                                    {errors.requirements}
                                </p>
                            )}
                        </div>

                        {/* Location and Job Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                                    Location *
                                </label>
                                <select
                                    id="location"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value as any })}
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-required="true"
                                >
                                    <option value="onsite">Onsite</option>
                                    <option value="remote">Remote</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="jobType" className="block text-sm font-medium text-gray-700 mb-1">
                                    Job Type *
                                </label>
                                <select
                                    id="jobType"
                                    value={formData.jobType}
                                    onChange={(e) => setFormData({ ...formData, jobType: e.target.value as any })}
                                    className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-required="true"
                                >
                                    <option value="full-time">Full-Time</option>
                                    <option value="part-time">Part-Time</option>
                                    <option value="internship">Internship</option>
                                </select>
                            </div>
                        </div>

                        {/* Salary Range */}
                        <div>
                            <label htmlFor="salaryMin" className="block text-sm font-medium text-gray-700 mb-2">
                                Salary Range (EGP) *
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <input
                                        type="number"
                                        id="salaryMin"
                                        placeholder="Minimum"
                                        value={formData.salaryMin}
                                        onChange={(e) => {
                                            setFormData({ ...formData, salaryMin: e.target.value });
                                            setErrors(prev => ({ ...prev, salaryMin: '', salaryMax: '' }));
                                        }}
                                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        aria-required="true"
                                        aria-invalid={!!errors.salaryMin}
                                        aria-describedby={errors.salaryMin ? 'salaryMin-error' : undefined}
                                    />
                                    {errors.salaryMin && (
                                        <p id="salaryMin-error" className="mt-1 text-sm text-red-600" role="alert">
                                            {errors.salaryMin}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <input
                                        type="number"
                                        id="salaryMax"
                                        placeholder="Maximum"
                                        value={formData.salaryMax}
                                        onChange={(e) => {
                                            setFormData({ ...formData, salaryMax: e.target.value });
                                            setErrors(prev => ({ ...prev, salaryMax: '' }));
                                        }}
                                        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        aria-required="true"
                                        aria-invalid={!!errors.salaryMax}
                                        aria-describedby={errors.salaryMax ? 'salaryMax-error' : undefined}
                                    />
                                    {errors.salaryMax && (
                                        <p id="salaryMax-error" className="mt-1 text-sm text-red-600" role="alert">
                                            {errors.salaryMax}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact Email */}
                        <div>
                            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                                Contact Email *
                            </label>
                            <input
                                type="email"
                                id="contactEmail"
                                value={formData.contactEmail}
                                onChange={(e) => {
                                    setFormData({ ...formData, contactEmail: e.target.value });
                                    setErrors(prev => ({ ...prev, contactEmail: '' }));
                                }}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="hr@example.com"
                                aria-required="true"
                                aria-invalid={!!errors.contactEmail}
                                aria-describedby={errors.contactEmail ? 'contactEmail-error' : undefined}
                            />
                            {errors.contactEmail && (
                                <p id="contactEmail-error" className="mt-1 text-sm text-red-600" role="alert">
                                    {errors.contactEmail}
                                </p>
                            )}
                        </div>

                        {/* Contact Phone */}
                        <div>
                            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-1">
                                Contact Phone (Optional)
                            </label>
                            <input
                                type="tel"
                                id="contactPhone"
                                value={formData.contactPhone}
                                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="+20 123 456 7890"
                            />
                        </div>
                    </div>

                    {/* Right Column - Company Logo */}
                    <div>
                        <label htmlFor="companyLogo" className="block text-sm font-medium text-gray-700 mb-2">
                            Company Logo
                        </label>
                        <div className="bg-gray-100 rounded-lg aspect-square flex items-center justify-center overflow-hidden relative">
                            {formData.companyLogo ? (
                                <Image
                                    src={formData.companyLogo}
                                    alt="Company logo"
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="text-center p-6">
                                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">No logo uploaded</p>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            id="logoUpload"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadImage(file);
                            }}
                            className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            disabled={uploadingImage}
                            aria-describedby={errors.companyLogo ? 'logo-error' : undefined}
                        />
                        {uploadingImage && <p className="mt-2 text-sm text-gray-500">Uploading...</p>}
                        {errors.companyLogo && (
                            <p id="logo-error" className="mt-1 text-sm text-red-600" role="alert">
                                {errors.companyLogo}
                            </p>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-8 space-y-3">
                            <Button
                                onClick={() => handleSubmit('published')}
                                variant="primary"
                                className="w-full"
                                disabled={isLoading || uploadingImage}
                            >
                                {isLoading ? 'Posting...' : 'Post'}
                            </Button>
                            <Button
                                onClick={() => handleSubmit('draft')}
                                variant="secondary"
                                className="w-full"
                                disabled={isLoading || uploadingImage}
                            >
                                {isLoading ? 'Saving...' : 'Save as Draft'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
