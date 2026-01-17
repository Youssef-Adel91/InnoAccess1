'use client';

import { useState, useEffect } from 'react';
import * as tus from 'tus-js-client';
import { generateBunnyUploadSignature, saveLessonVideo } from '@/app/actions/bunnyUpload';

interface VideoUploaderProps {
    courseId: string;
    moduleIndex: number;
    onUploadComplete?: () => void;
    onSuccess?: (data: any) => void;
    isFreePreview?: boolean;
}

export function VideoUploader({ courseId, moduleIndex, onUploadComplete, onSuccess, isFreePreview = false }: VideoUploaderProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form fields
    const [title, setTitle] = useState('');
    const [transcript, setTranscript] = useState('');
    const [duration, setDuration] = useState(0);
    const [order, setOrder] = useState(1);

    // Prevent page closure during upload
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (uploading) {
                e.preventDefault();
                e.returnValue = ''; // Shows browser warning
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [uploading]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validate file type
        const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
        if (!validTypes.includes(selectedFile.type)) {
            setError('Please select a valid video file (MP4, WebM, OGG, or MOV)');
            return;
        }

        // Validate file size (max 2GB)
        const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
        if (selectedFile.size > maxSize) {
            setError('File size must be less than 2GB');
            return;
        }

        setFile(selectedFile);
        setError(null);

        // Auto-populate title from filename
        if (!title) {
            const filename = selectedFile.name.replace(/\.[^/.]+$/, '');
            setTitle(filename);
        }

        // Get video duration
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            setDuration(Math.floor(video.duration));
            URL.revokeObjectURL(video.src);
        };
        video.src = URL.createObjectURL(selectedFile);
    };

    const handleUpload = async () => {
        if (!file || !title || !transcript) {
            setError('Please fill in all required fields');
            return;
        }

        setUploading(true);
        setError(null);
        setProgress(0);

        try {
            console.log('🎬 Starting video upload process...');

            // Step 1: Generate secure upload signature
            const signatureResult = await generateBunnyUploadSignature(title);

            if (!signatureResult.success || !signatureResult.data) {
                throw new Error(signatureResult.error?.message || 'Failed to generate upload signature');
            }

            const { videoId, libraryId, authSignature, expirationTime, uploadUrl } = signatureResult.data;

            console.log('✅ Upload signature generated for video:', videoId);

            // Step 2: Upload video to Bunny.net using TUS protocol
            await new Promise<void>((resolve, reject) => {
                const upload = new tus.Upload(file, {
                    endpoint: uploadUrl,
                    retryDelays: [0, 3000, 5000, 10000, 20000],
                    headers: {
                        'AuthorizationSignature': authSignature,
                        'AuthorizationExpire': expirationTime.toString(),
                        'VideoId': videoId,
                        'LibraryId': libraryId,
                    },
                    metadata: {
                        filetype: file.type,
                        title: title,
                    },
                    chunkSize: 10 * 1024 * 1024, // 10MB chunks for better performance
                    onError: (error) => {
                        console.error('❌ Upload failed:', error);
                        reject(new Error(`Upload failed: ${error.message}`));
                    },
                    onProgress: (bytesUploaded, bytesTotal) => {
                        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
                        setProgress(parseFloat(percentage));
                        console.log(`📤 Upload progress: ${percentage}%`);
                    },
                    onSuccess: () => {
                        console.log('✅ Upload completed successfully');
                        resolve();
                    },
                });

                upload.start();
            });

            // Step 3: Save video metadata to database
            console.log('💾 Saving video metadata...');
            const saveResult = await saveLessonVideo({
                courseId,
                moduleIndex,
                videoData: {
                    title,
                    bunnyVideoId: videoId,
                    transcript,
                    duration,
                    order,
                    isFreePreview,
                },
            });

            if (!saveResult.success) {
                throw new Error(saveResult.error?.message || 'Failed to save video metadata');
            }

            console.log('✅ Video saved with status:', saveResult.data?.status);

            setSuccess(true);
            setProgress(100);

            // Call success callback
            if (onSuccess) {
                onSuccess(saveResult.data);
            }

            // Reset form
            setTimeout(() => {
                setFile(null);
                setTitle('');
                setTranscript('');
                setDuration(0);
                setOrder(order + 1);
                setSuccess(false);
                setProgress(0);
                onUploadComplete?.();
            }, 2000);

        } catch (err: any) {
            console.error('❌ Upload error:', err);
            setError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Upload Video Lesson</h2>

            {/* File Selection */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video File *
                </label>
                <input
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                />
                {file && (
                    <p className="mt-2 text-sm text-gray-600">
                        Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                )}
            </div>

            {/* Title */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video Title *
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={uploading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Introduction to Accessibility"
                />
            </div>

            {/* Transcript */}
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transcript (Required for Accessibility) *
                </label>
                <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    disabled={uploading}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Full transcript of the video content..."
                />
            </div>

            {/* Duration & Order */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (auto-detected)
                    </label>
                    <input
                        type="text"
                        value={duration > 0 ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} (${duration}s)` : 'N/A'}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Automatically calculated from video file
                    </p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Order
                    </label>
                    <input
                        type="number"
                        value={order}
                        onChange={(e) => setOrder(parseInt(e.target.value))}
                        disabled={uploading}
                        min={1}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            {/* Progress Bar */}
            {uploading && (
                <div className="mb-4">
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-blue-700">Uploading...</span>
                        <span className="text-sm font-medium text-blue-700">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-amber-600 mt-2 font-medium">
                        ⚠️ Please do not close this tab or navigate away while uploading.
                    </p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                        ✅ Video uploaded successfully! It will be reviewed by an admin before being published.
                    </p>
                </div>
            )}

            {/* Upload Button */}
            <button
                onClick={handleUpload}
                disabled={!file || uploading || !title || !transcript}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
                {uploading ? 'Uploading...' : 'Upload Video'}
            </button>

            <p className="mt-4 text-sm text-gray-600 text-center">
                Videos uploaded by trainers require admin approval before becoming visible to students.
            </p>
        </div>
    );
}
