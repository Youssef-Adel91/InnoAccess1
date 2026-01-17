'use client';

import { useState } from 'react';
import { approveTrainer, rejectTrainer } from '@/app/actions/trainerApplication';

interface TrainerRequestCardProps {
    application: {
        _id: string;
        userId: {
            _id: string;
            name: string;
            email: string;
        };
        bio: string;
        linkedInUrl?: string;
        websiteUrl?: string;
        cvUrl: string;
        specialization: string;
        createdAt: Date;
    };
    onStatusUpdate?: () => void;
}

export function TrainerRequestCard({ application, onStatusUpdate }: TrainerRequestCardProps) {
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleApprove = async () => {
        if (!confirm('Are you sure you want to approve this trainer application?')) {
            return;
        }

        setProcessing(true);
        setError(null);

        try {
            const result = await approveTrainer(application._id);

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to approve trainer');
            }

            console.log('✅ Trainer approved');
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
            const result = await rejectTrainer(application._id, rejectionReason.trim());

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to reject trainer');
            }

            console.log('✅ Trainer rejected');
            onStatusUpdate?.();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            {/* Header */}
            <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {application.userId.name}
                </h3>
                <p className="text-gray-600">
                    ✉️ {application.userId.email}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                    Applied on: {formatDate(application.createdAt)}
                </p>
            </div>

            {/* Specialization */}
            <div className="mb-4">
                <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {application.specialization}
                </span>
            </div>

            {/* Bio */}
            <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Professional Bio:</h4>
                <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{application.bio}</p>
                </div>
            </div>

            {/* Links */}
            <div className="mb-4 space-y-2">
                {application.linkedInUrl && (
                    <div>
                        <span className="font-semibold text-gray-900">LinkedIn: </span>
                        <a
                            href={application.linkedInUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            {application.linkedInUrl}
                        </a>
                    </div>
                )}
                {application.websiteUrl && (
                    <div>
                        <span className="font-semibold text-gray-900">Website: </span>
                        <a
                            href={application.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                        >
                            {application.websiteUrl}
                        </a>
                    </div>
                )}
            </div>

            {/* CV Download */}
            <div className="mb-6">
                <a
                    href={application.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    📄 Download / View CV
                </a>
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
                        {processing ? 'Processing...' : '✅ Approve Trainer'}
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
                        placeholder="Explain why this application is being rejected (e.g., insufficient experience, incomplete information, etc.)"
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
