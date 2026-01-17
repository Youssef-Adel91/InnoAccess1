'use client';

import { useState } from 'react';
import { updateVideoStatus } from '@/app/actions/bunnyUpload';

interface VideoApprovalCardProps {
    video: {
        courseId: string;
        courseTitle: string;
        moduleIndex: number;
        moduleTitle: string;
        videoIndex: number;
        bunnyVideoId: string;
        title: string;
        duration: number;
        transcript: string;
        trainerName: string;
        trainerEmail: string;
        uploadedAt: Date;
    };
    onStatusUpdate?: () => void;
}

export function VideoApprovalCard({ video, onStatusUpdate }: VideoApprovalCardProps) {
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '581413';

    const handleApprove = async () => {
        setProcessing(true);
        setError(null);

        try {
            const result = await updateVideoStatus({
                courseId: video.courseId,
                moduleIndex: video.moduleIndex,
                videoIndex: video.videoIndex,
                status: 'approved',
            });

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to approve video');
            }

            console.log('✅ Video approved');
            onStatusUpdate?.();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            setError('Please provide a reason for rejection');
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            const result = await updateVideoStatus({
                courseId: video.courseId,
                moduleIndex: video.moduleIndex,
                videoIndex: video.videoIndex,
                status: 'rejected',
                rejectionReason: rejectionReason.trim(),
            });

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to reject video');
            }

            console.log('✅ Video rejected');
            onStatusUpdate?.();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            {/* Header */}
            <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{video.title}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>📚 {video.courseTitle}</span>
                    <span>📁 {video.moduleTitle}</span>
                    <span>⏱️ {formatDuration(video.duration)}</span>
                </div>
            </div>

            {/* Trainer Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                    <strong>Uploaded by:</strong> {video.trainerName} ({video.trainerEmail})
                </p>
                <p className="text-sm text-gray-600">
                    <strong>Upload date:</strong> {formatDate(video.uploadedAt)}
                </p>
            </div>

            {/* Video Player */}
            <div className="mb-4">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                        src={`https://iframe.mediadelivery.net/embed/${libraryId}/${video.bunnyVideoId}?autoplay=false&preload=true`}
                        loading="lazy"
                        className="absolute top-0 left-0 w-full h-full rounded-lg"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                </div>
            </div>

            {/* Transcript Section */}
            <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Transcript (Accessibility):</h4>
                <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{video.transcript}</p>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {/* Actions */}
            {!showRejectForm ? (
                <div className="flex gap-3">
                    <button
                        onClick={handleApprove}
                        disabled={processing}
                        className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {processing ? 'Processing...' : '✅ Approve'}
                    </button>
                    <button
                        onClick={() => setShowRejectForm(true)}
                        disabled={processing}
                        className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                        ❌ Reject
                    </button>
                </div>
            ) : (
                <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Rejection Reason:</h4>
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why this video is being rejected (e.g., poor audio quality, missing content, etc.)"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-3"
                    />
                    <div className="flex gap-3">
                        <button
                            onClick={handleReject}
                            disabled={processing || !rejectionReason.trim()}
                            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {processing ? 'Processing...' : 'Confirm Rejection'}
                        </button>
                        <button
                            onClick={() => {
                                setShowRejectForm(false);
                                setRejectionReason('');
                                setError(null);
                            }}
                            disabled={processing}
                            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
