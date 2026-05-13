'use client';

import { useState } from 'react';
import { saveYouTubeLesson } from '@/app/actions/courseManagement';
import { Youtube, CheckCircle, AlertCircle } from 'lucide-react';

interface YouTubeUploaderProps {
    courseId: string;
    moduleIndex: number;
    onSuccess?: (data: any) => void;
    isFreePreview?: boolean;
}

/**
 * Extracts YouTube video ID from various URL formats:
 *  - https://www.youtube.com/watch?v=VIDEO_ID
 *  - https://youtu.be/VIDEO_ID
 *  - https://www.youtube.com/embed/VIDEO_ID
 *  - https://www.youtube.com/shorts/VIDEO_ID
 */
function extractYouTubeId(url: string): string | null {
    const regex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

export function YouTubeUploader({
    courseId,
    moduleIndex,
    onSuccess,
    isFreePreview = false,
}: YouTubeUploaderProps) {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [title, setTitle] = useState('');
    const [transcript, setTranscript] = useState('');
    const [order, setOrder] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Derive video ID for preview (live as user types)
    const previewVideoId = extractYouTubeId(youtubeUrl);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!previewVideoId) {
            setError('Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=XXXX)');
            return;
        }

        setSubmitting(true);

        try {
            const result = await saveYouTubeLesson({
                courseId,
                moduleIndex,
                videoData: {
                    title,
                    youtubeUrl,
                    transcript,
                    order,
                    isFreePreview,
                },
            });

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to save YouTube lesson');
            }

            setSuccess(true);

            // Notify parent and reset after short delay
            setTimeout(() => {
                setYoutubeUrl('');
                setTitle('');
                setTranscript('');
                setSuccess(false);
                onSuccess?.(result.data);
            }, 1500);
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5"
            aria-label="Add YouTube lesson form"
            noValidate
        >
            {/* ── YouTube URL input ── */}
            <div>
                <label
                    htmlFor="youtube-url"
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    YouTube Video URL <span aria-hidden="true">*</span>
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Youtube className="h-5 w-5 text-red-500" aria-hidden="true" />
                    </div>
                    <input
                        id="youtube-url"
                        type="url"
                        value={youtubeUrl}
                        onChange={(e) => {
                            setYoutubeUrl(e.target.value);
                            setError(null);
                        }}
                        required
                        placeholder="https://www.youtube.com/watch?v=..."
                        aria-describedby={error ? 'youtube-url-error' : 'youtube-url-hint'}
                        aria-invalid={!!error}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
                <p id="youtube-url-hint" className="mt-1 text-xs text-gray-500">
                    Accepts youtube.com/watch, youtu.be, /embed/ and /shorts/ links.
                </p>
            </div>

            {/* ── Thumbnail Preview (extracted on the fly) ── */}
            {previewVideoId && (
                <div
                    className="flex items-center gap-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                    aria-live="polite"
                    aria-label="YouTube video preview"
                >
                    <img
                        src={`https://img.youtube.com/vi/${previewVideoId}/mqdefault.jpg`}
                        alt={`Thumbnail for YouTube video ${previewVideoId}`}
                        className="w-24 h-16 object-cover rounded"
                    />
                    <div>
                        <p className="text-sm font-medium text-red-800 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" aria-hidden="true" />
                            Valid YouTube URL detected
                        </p>
                        <p className="text-xs text-red-600 mt-0.5">Video ID: {previewVideoId}</p>
                    </div>
                </div>
            )}

            {/* ── Lesson Title ── */}
            <div>
                <label
                    htmlFor="youtube-title"
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    Lesson Title <span aria-hidden="true">*</span>
                </label>
                <input
                    id="youtube-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    placeholder="Introduction to Accessibility"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* ── Transcript (WCAG requirement) ── */}
            <div>
                <label
                    htmlFor="youtube-transcript"
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    Transcript{' '}
                    <span aria-hidden="true">*</span>{' '}
                    <span className="text-xs font-normal text-gray-500">(Required for accessibility)</span>
                </label>
                <textarea
                    id="youtube-transcript"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    required
                    rows={6}
                    placeholder="Paste the full transcript of the video here..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">
                    A transcript makes your lesson fully accessible to deaf and hard-of-hearing students.
                </p>
            </div>

            {/* ── Order ── */}
            <div>
                <label
                    htmlFor="youtube-order"
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    Lesson Order
                </label>
                <input
                    id="youtube-order"
                    type="number"
                    value={order}
                    onChange={(e) => setOrder(parseInt(e.target.value, 10))}
                    min={1}
                    className="w-28 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {/* ── Error Message ── */}
            {error && (
                <div
                    id="youtube-url-error"
                    role="alert"
                    aria-live="assertive"
                    className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {/* ── Success Message ── */}
            {success && (
                <div
                    role="status"
                    aria-live="polite"
                    className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg"
                >
                    <CheckCircle className="h-5 w-5 text-green-600" aria-hidden="true" />
                    <p className="text-sm text-green-800 font-medium">
                        ✅ YouTube lesson added successfully!
                    </p>
                </div>
            )}

            {/* ── Submit ── */}
            <button
                type="submit"
                disabled={submitting || !previewVideoId || !title || !transcript || success}
                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
                <Youtube className="h-5 w-5" aria-hidden="true" />
                {submitting ? 'Saving...' : 'Add YouTube Lesson'}
            </button>
        </form>
    );
}
