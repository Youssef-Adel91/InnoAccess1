'use client';

import { useState } from 'react';
import { Calendar, Clock, Link2, FileText, Save, AlertCircle } from 'lucide-react';
import { updateLiveSessionLinks } from '@/app/actions/courseManagement';

interface LiveCourseManagementProps {
    course: {
        _id: string;
        title: string;
        courseType: 'RECORDED' | 'LIVE';
        liveSession?: {
            startDate: string | Date;
            durationMinutes: number;
            zoomMeetingLink: string;
            zoomRecordingLink?: string;
            isRecordingAvailable: boolean;
            instructions?: string;
        };
    };
    onUpdate: () => void;
}

export default function LiveCourseManagement({ course, onUpdate }: LiveCourseManagementProps) {
    const [meetingLink, setMeetingLink] = useState(course.liveSession?.zoomMeetingLink || '');
    const [recordingLink, setRecordingLink] = useState(course.liveSession?.zoomRecordingLink || '');
    const [instructions, setInstructions] = useState(course.liveSession?.instructions || '');
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    if (!course.liveSession) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-800">No live session data found for this course.</p>
            </div>
        );
    }

    const { startDate, durationMinutes } = course.liveSession;

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdating(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const result = await updateLiveSessionLinks(course._id, {
                zoomMeetingLink: meetingLink,
                zoomRecordingLink: recordingLink || undefined,
                instructions: instructions || undefined,
            });

            if (!result.success) {
                throw new Error(result.error?.message || 'Failed to update session');
            }

            setSuccessMessage('✅ Session details updated successfully!');
            onUpdate(); // Refresh parent data

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold mr-3">
                        🔴 LIVE WORKSHOP
                    </span>
                    Workshop Management
                </h2>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800 font-medium">{successMessage}</p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {/* Session Details Card (Read-only) */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg shadow-md p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                    Session Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-1">Scheduled Date & Time</p>
                        <p className="font-semibold text-gray-900">
                            {new Date(startDate).toLocaleDateString([], {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">
                            {new Date(startDate).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZoneName: 'short',
                            })}
                        </p>
                    </div>

                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <p className="text-sm text-gray-500 mb-1 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            Duration
                        </p>
                        <p className="font-semibold text-gray-900">
                            {durationMinutes} minutes
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                            ({Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m)
                        </p>
                    </div>
                </div>
            </div>

            {/* Zoom Links Management Form */}
            <form onSubmit={handleUpdate} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                    <Link2 className="h-5 w-5 mr-2 text-purple-600" />
                    Zoom Links Management
                </h3>

                <div className="space-y-6">
                    {/* Meeting Link */}
                    <div>
                        <label htmlFor="meetingLink" className="block text-sm font-semibold text-gray-700 mb-2">
                            🎥 Zoom Meeting Link
                            <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                            type="url"
                            id="meetingLink"
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                            required
                            placeholder="https://zoom.us/j/..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            This link will be available to students before and during the workshop
                        </p>
                    </div>

                    {/* Recording Link */}
                    <div>
                        <label htmlFor="recordingLink" className="block text-sm font-semibold text-gray-700 mb-2">
                            📹 Zoom Recording Link
                            <span className="text-gray-400 ml-1 font-normal">(Optional - Add after workshop ends)</span>
                        </label>
                        <input
                            type="url"
                            id="recordingLink"
                            value={recordingLink}
                            onChange={(e) => setRecordingLink(e.target.value)}
                            placeholder="https://zoom.us/rec/..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Students will be able to view the recording after you add this link
                        </p>
                    </div>

                    {/* Instructions */}
                    <div>
                        <label htmlFor="instructions" className="block text-sm font-semibold text-gray-700 mb-2">
                            <FileText className="inline h-4 w-4 mr-1" />
                            Preparation Instructions
                            <span className="text-gray-400 ml-1 font-normal">(Optional)</span>
                        </label>
                        <textarea
                            id="instructions"
                            value={instructions}
                            onChange={(e) => setInstructions(e.target.value)}
                            rows={4}
                            placeholder="e.g., Please install the Zoom app and test your microphone before joining..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            These instructions will be shown to students on the course page
                        </p>
                    </div>
                </div>

                {/* Update Button */}
                <div className="mt-8 flex items-center justify-end space-x-4">
                    <button
                        type="submit"
                        disabled={updating || !meetingLink}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                    >
                        <Save className="h-5 w-5 mr-2" />
                        {updating ? 'Updating...' : 'Update Session Details'}
                    </button>
                </div>
            </form>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">💡 Tips for Managing Your Workshop:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            <li>Share the meeting link at least 24 hours before the workshop starts</li>
                            <li>Test your Zoom link before sharing it with students</li>
                            <li>Add the recording link within 24-48 hours after the workshop ends</li>
                            <li>Students will receive email notifications when you update these details</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
