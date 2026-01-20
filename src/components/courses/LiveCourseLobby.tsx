'use client';

import { useEffect, useState } from 'react';
import { Calendar, Clock, Video, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface LiveCourseLobbyProps {
    course: {
        _id: string;
        title: string;
        description: string;
        thumbnail?: string;
        enrollmentCount: number;
        categoryId: {
            name: string;
            slug: string;
        };
        trainerId: {
            name: string;
            email: string;
        };
        liveSession?: {
            startDate: string | Date;
            durationMinutes: number;
            zoomMeetingLink: string;
            zoomRecordingLink?: string;
            isRecordingAvailable: boolean;
            instructions?: string;
        };
    };
}

type SessionState = 'UPCOMING' | 'STARTING_SOON' | 'LIVE' | 'ENDED';

export default function LiveCourseLobby({ course }: LiveCourseLobbyProps) {
    const [sessionState, setSessionState] = useState<SessionState>('UPCOMING');
    const [timeUntilStart, setTimeUntilStart] = useState<number>(0);
    const [timeOffset, setTimeOffset] = useState<number>(0); // Dev tool: minutes offset

    if (!course.liveSession) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-gray-600">No live session data available.</p>
            </div>
        );
    }

    const { startDate, durationMinutes, zoomMeetingLink, zoomRecordingLink, instructions } = course.liveSession;

    // Calculate session state and time differences
    useEffect(() => {
        const updateSessionState = () => {
            // Get current time with debug offset applied
            const now = new Date(Date.now() + timeOffset * 60 * 1000);
            const sessionStart = new Date(startDate);
            const sessionEnd = new Date(sessionStart.getTime() + durationMinutes * 60 * 1000);

            const msUntilStart = sessionStart.getTime() - now.getTime();
            const msUntilEnd = sessionEnd.getTime() - now.getTime();

            setTimeUntilStart(msUntilStart);

            // State machine logic
            if (msUntilEnd < 0) {
                setSessionState('ENDED');
            } else if (msUntilStart <= 0) {
                setSessionState('LIVE');
            } else if (msUntilStart <= 10 * 60 * 1000) { // 10 minutes before
                setSessionState('STARTING_SOON');
            } else {
                setSessionState('UPCOMING');
            }
        };

        updateSessionState();
        const interval = setInterval(updateSessionState, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [startDate, durationMinutes, timeOffset]);

    // Format countdown display
    const formatCountdown = (ms: number) => {
        if (ms <= 0) return 'Starting now...';

        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;

        if (days > 0) {
            return `${days}d ${remainingHours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes} minutes`;
        }
    };

    // Handle action button click
    const handleActionClick = () => {
        if (sessionState === 'STARTING_SOON' || sessionState === 'LIVE') {
            window.open(zoomMeetingLink, '_blank', 'noopener,noreferrer');
        } else if (sessionState === 'ENDED' && zoomRecordingLink) {
            window.open(zoomRecordingLink, '_blank', 'noopener,noreferrer');
        }
    };

    // Render action button based on state
    const renderActionButton = () => {
        switch (sessionState) {
            case 'UPCOMING':
                return (
                    <div className="text-center">
                        <Button
                            variant="secondary"
                            size="lg"
                            disabled
                            className="px-8 py-4 text-lg font-semibold bg-gray-400 cursor-not-allowed"
                        >
                            <Calendar className="h-5 w-5 mr-2" />
                            Starting Soon
                        </Button>
                        <p className="mt-4 text-gray-600 text-lg">
                            Starts in: <span className="font-bold text-gray-900">{formatCountdown(timeUntilStart)}</span>
                        </p>
                    </div>
                );

            case 'STARTING_SOON':
                return (
                    <div className="text-center">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleActionClick}
                            className="px-8 py-4 text-lg font-semibold bg-yellow-500 hover:bg-yellow-600 text-white shadow-lg transform transition-all hover:scale-105"
                        >
                            <Video className="h-5 w-5 mr-2" />
                            Join Waiting Room
                        </Button>
                        <p className="mt-4 text-yellow-700 text-lg font-semibold">
                            ⚠️ Session starts in {formatCountdown(timeUntilStart)}
                        </p>
                    </div>
                );

            case 'LIVE':
                return (
                    <div className="text-center">
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={handleActionClick}
                            className="px-10 py-5 text-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-2xl animate-pulse transform transition-all hover:scale-110"
                        >
                            <span className="inline-block w-3 h-3 bg-white rounded-full mr-3 animate-ping"></span>
                            🔴 JOIN LIVE NOW
                        </Button>
                        <p className="mt-4 text-red-600 text-lg font-bold animate-pulse">
                            ● Workshop is LIVE!
                        </p>
                    </div>
                );

            case 'ENDED':
                if (zoomRecordingLink) {
                    return (
                        <div className="text-center">
                            <Button
                                variant="primary"
                                size="lg"
                                onClick={handleActionClick}
                                className="px-8 py-4 text-lg font-semibold bg-green-600 hover:bg-green-700 text-white shadow-lg transform transition-all hover:scale-105"
                            >
                                <Video className="h-5 w-5 mr-2" />
                                View Recording
                            </Button>
                            <p className="mt-4 text-green-700 text-sm">
                                ✅ Workshop has ended. Recording is now available.
                            </p>
                        </div>
                    );
                } else {
                    return (
                        <div className="text-center">
                            <Button
                                variant="secondary"
                                size="lg"
                                disabled
                                className="px-8 py-4 text-lg font-semibold bg-gray-500 cursor-not-allowed text-white"
                            >
                                Workshop Ended
                            </Button>
                            <p className="mt-4 text-gray-600 text-sm">
                                Recording will be available soon.
                            </p>
                        </div>
                    );
                }

            default:
                return null;
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Back Navigation */}
            <div className="bg-white border-b">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Link href="/courses" className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors">
                        <ArrowLeft className="h-5 w-5 mr-2" />
                        Back to Courses
                    </Link>
                </div>
            </div>

            {/* Hero Section */}
            <div className="bg-gradient-to-br from-red-600 via-purple-600 to-blue-700 text-white py-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    {/* Dynamic Badge based on Session State */}
                    {sessionState === 'UPCOMING' && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 rounded-full text-sm font-bold mb-6 shadow-lg">
                            <span className="inline-block w-2 h-2 bg-white rounded-full"></span>
                            ⏰ UPCOMING WORKSHOP
                        </div>
                    )}
                    {sessionState === 'STARTING_SOON' && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 rounded-full text-sm font-bold mb-6 animate-pulse shadow-lg">
                            <span className="inline-block w-2 h-2 bg-white rounded-full animate-ping"></span>
                            🟡 STARTING SOON
                        </div>
                    )}
                    {sessionState === 'LIVE' && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 rounded-full text-sm font-bold mb-6 animate-pulse shadow-lg">
                            <span className="inline-block w-2 h-2 bg-white rounded-full animate-ping"></span>
                            🔴 LIVE NOW
                        </div>
                    )}
                    {sessionState === 'ENDED' && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 rounded-full text-sm font-bold mb-6 shadow-lg">
                            <span className="inline-block w-2 h-2 bg-white rounded-full"></span>
                            ✅ WORKSHOP ENDED
                        </div>
                    )}

                    {/* Category */}
                    <div className="mb-4">
                        <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                            {course.categoryId.name}
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                        {course.title}
                    </h1>

                    {/* Description */}
                    <p className="text-xl text-white/90 mb-8 max-w-3xl mx-auto">
                        {course.description}
                    </p>

                    {/* Thumbnail */}
                    {course.thumbnail && (
                        <div className="max-w-2xl mx-auto mb-8">
                            <img
                                src={course.thumbnail}
                                alt={course.title}
                                className="w-full h-64 object-cover rounded-xl shadow-2xl border-4 border-white/30"
                            />
                        </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center justify-center gap-6 text-sm text-white/90">
                        <span className="flex items-center">
                            <Users className="h-5 w-5 mr-1" />
                            {course.enrollmentCount || 0} enrolled
                        </span>
                        <span>•</span>
                        <span>Instructor: <strong>{course.trainerId.name}</strong></span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Event Details Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                        <Calendar className="h-6 w-6 mr-3 text-blue-600" />
                        Workshop Details
                    </h2>

                    <div className="space-y-6">
                        {/* Start Date */}
                        <div className="flex items-start gap-4 pb-6 border-b">
                            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Scheduled Date & Time
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                    {new Date(startDate).toLocaleDateString([], {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                                <p className="text-lg text-gray-700 mt-1">
                                    {new Date(startDate).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZoneName: 'short'
                                    })}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    ⏰ Displayed in your local timezone
                                </p>
                            </div>
                        </div>

                        {/* Duration */}
                        <div className="flex items-start gap-4 pb-6 border-b">
                            <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Clock className="h-6 w-6 text-purple-600" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                    Duration
                                </p>
                                <p className="text-lg font-bold text-gray-900">
                                    {durationMinutes} minutes ({Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m)
                                </p>
                            </div>
                        </div>

                        {/* Instructions */}
                        {instructions && (
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <span className="text-2xl">📋</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                        Preparation Instructions
                                    </p>
                                    <p className="text-gray-700 leading-relaxed">
                                        {instructions}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Button Area */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-12 border border-gray-200">
                    {renderActionButton()}
                </div>

                {/* Additional Info */}
                <div className="mt-8 text-center text-sm text-gray-600">
                    <p>📧 You will receive email reminders before the workshop starts.</p>
                    <p className="mt-2">💡 Make sure you have Zoom installed and ready to join.</p>
                </div>
            </div>

            {/* 🔧 TIME TRAVEL DEBUG TOOL (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-0 left-0 right-0 bg-black/90 text-white p-6 border-t-2 border-yellow-400 shadow-2xl z-50">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-yellow-400 flex items-center gap-2">
                                    🔧 Developer Time Travel Tool
                                </h3>
                                <p className="text-xs text-gray-400 mt-1">
                                    Adjust the slider to simulate different times and test button states
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-gray-400">Current State:</p>
                                <p className="text-xl font-bold text-green-400">{sessionState}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <label className="text-sm font-semibold whitespace-nowrap">
                                Time Offset:
                            </label>
                            <input
                                type="range"
                                min="-120"
                                max="120"
                                step="5"
                                value={timeOffset}
                                onChange={(e) => setTimeOffset(Number(e.target.value))}
                                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                            />
                            <div className="text-right min-w-[200px]">
                                <p className="text-sm font-mono">
                                    <span className="text-yellow-400">{timeOffset > 0 ? '+' : ''}{timeOffset}</span> minutes
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Simulated Time: {new Date(Date.now() + timeOffset * 60 * 1000).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-700 grid grid-cols-4 gap-3 text-xs">
                            <button
                                onClick={() => {
                                    // Calculate minutes until workshop starts, then add extra 120 minutes (2 hours before)
                                    const msUntilStart = new Date(startDate).getTime() - Date.now();
                                    const minutesUntilStart = Math.floor(msUntilStart / 60000);
                                    setTimeOffset(minutesUntilStart - 120);
                                }}
                                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
                            >
                                UPCOMING
                            </button>
                            <button
                                onClick={() => {
                                    // 5 minutes before workshop
                                    const msUntilStart = new Date(startDate).getTime() - Date.now();
                                    const minutesUntilStart = Math.floor(msUntilStart / 60000);
                                    setTimeOffset(minutesUntilStart - 5);
                                }}
                                className="px-3 py-2 bg-yellow-700 hover:bg-yellow-600 rounded transition"
                            >
                                STARTING_SOON
                            </button>
                            <button
                                onClick={() => {
                                    // 10 minutes into the workshop
                                    const msUntilStart = new Date(startDate).getTime() - Date.now();
                                    const minutesUntilStart = Math.floor(msUntilStart / 60000);
                                    setTimeOffset(minutesUntilStart + 10);
                                }}
                                className="px-3 py-2 bg-red-700 hover:bg-red-600 rounded transition"
                            >
                                LIVE
                            </button>
                            <button
                                onClick={() => {
                                    // 10 minutes after workshop ends
                                    const msUntilStart = new Date(startDate).getTime() - Date.now();
                                    const minutesUntilStart = Math.floor(msUntilStart / 60000);
                                    setTimeOffset(minutesUntilStart + durationMinutes + 10);
                                }}
                                className="px-3 py-2 bg-green-700 hover:bg-green-600 rounded transition"
                            >
                                ENDED
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
