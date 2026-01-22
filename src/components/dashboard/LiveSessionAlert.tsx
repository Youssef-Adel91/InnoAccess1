'use client';

import Link from 'next/link';
import { Video, Clock, Calendar, ArrowRight } from 'lucide-react';

interface LiveSessionAlertProps {
    course: {
        _id: string;
        title: string;
        liveSession: {
            startDate: string;
            durationMinutes: number;
            zoomMeetingLink: string;
        };
    };
}

type SessionState = 'UPCOMING' | 'STARTING_SOON' | 'LIVE_NOW' | 'ENDED';

function getSessionState(startDate: string, durationMinutes: number): {
    state: SessionState;
    minutesUntilStart: number;
    minutesSinceStart: number;
} {
    // Use UTC timestamps to avoid timezone inconsistencies between localhost and production
    const now = Date.now(); // Current UTC timestamp
    const sessionStart = new Date(startDate).getTime(); // Convert to UTC timestamp
    const sessionEnd = sessionStart + (durationMinutes * 60000);

    const diffMs = sessionStart - now;
    const minutesUntilStart = Math.floor(diffMs / 60000);
    const minutesSinceStart = Math.floor((now - sessionStart) / 60000);

    let state: SessionState;

    if (now >= sessionEnd) {
        state = 'ENDED';
    } else if (now >= sessionStart) {
        state = 'LIVE_NOW';
    } else if (minutesUntilStart <= 15) {
        state = 'STARTING_SOON';
    } else {
        state = 'UPCOMING';
    }

    return { state, minutesUntilStart, minutesSinceStart };
}

function formatTimeRemaining(minutes: number): string {
    if (minutes < 0) return 'Started';
    if (minutes === 0) return 'Starting now';
    if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''}`;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours >= 24) {
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''}`;
    }

    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
}

export function LiveSessionAlert({ course }: LiveSessionAlertProps) {
    const { state, minutesUntilStart, minutesSinceStart } = getSessionState(
        course.liveSession.startDate,
        course.liveSession.durationMinutes
    );

    // Don't render if session has ended
    if (state === 'ENDED') {
        return null;
    }

    const sessionDate = new Date(course.liveSession.startDate);

    // Styling based on state
    const stateConfig = {
        LIVE_NOW: {
            bgColor: 'bg-gradient-to-r from-red-50 to-pink-50 border-red-400',
            iconColor: 'text-red-600',
            buttonBg: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-600',
            buttonText: 'Join Now - Session is LIVE! 🔴',
            badge: 'LIVE NOW',
            badgeBg: 'bg-red-600',
            message: 'Session is currently live! Join now.',
        },
        STARTING_SOON: {
            bgColor: 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-400',
            iconColor: 'text-orange-600',
            buttonBg: 'bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-600',
            buttonText: 'Join Zoom - Starting Soon',
            badge: 'STARTING SOON',
            badgeBg: 'bg-orange-600',
            message: `Session starts in ${formatTimeRemaining(minutesUntilStart)}. Get ready!`,
        },
        UPCOMING: {
            bgColor: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300',
            iconColor: 'text-blue-600',
            buttonBg: 'bg-gray-400 cursor-not-allowed',
            buttonText: 'Upcoming',
            badge: 'UPCOMING',
            badgeBg: 'bg-blue-600',
            message: `Session starts in ${formatTimeRemaining(minutesUntilStart)}`,
        },
    } as const;

    const config = stateConfig[state];

    return (
        <div className={`rounded-lg border-2 ${config.bgColor} p-6 shadow-md`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                    <div className={`inline-flex p-2 rounded-full bg-white ${config.iconColor} mr-3`}>
                        <Video className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">Live Workshop</h3>
                            <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold text-white ${config.badgeBg}`}
                            >
                                {config.badge}
                            </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{course.title}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-700">
                    <Clock className={`h-4 w-4 mr-2 ${config.iconColor}`} aria-hidden="true" />
                    <span className="font-semibold">{config.message}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                    <span>
                        {sessionDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                        })}
                        {' at '}
                        {sessionDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                        {' '}
                        ({course.liveSession.durationMinutes} mins)
                    </span>
                </div>
            </div>

            <div className="flex gap-3">
                {state === 'UPCOMING' ? (
                    <button
                        disabled
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold text-white transition-colors ${config.buttonBg} focus-visible:outline-none`}
                    >
                        <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
                        {config.buttonText}
                    </button>
                ) : (
                    <a
                        href={course.liveSession.zoomMeetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold text-white transition-colors ${config.buttonBg} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
                    >
                        <Video className="h-4 w-4 mr-2" aria-hidden="true" />
                        {config.buttonText}
                    </a>
                )}
                <Link
                    href={`/courses/${course._id}`}
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                >
                    View Details
                    <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                </Link>
            </div>

            {state === 'LIVE_NOW' && (
                <div className="mt-4 p-3 bg-white rounded-md border-l-4 border-red-500 animate-pulse">
                    <p className="text-sm font-medium text-red-900">
                        🔴 Session is LIVE! Don't miss it - join now!
                    </p>
                </div>
            )}
        </div>
    );
}
