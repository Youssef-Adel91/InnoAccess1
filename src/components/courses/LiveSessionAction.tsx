'use client';

import { useState, useEffect } from 'react';
import { Video, Calendar, Clock, PlayCircle } from 'lucide-react';

interface LiveSessionProps {
    liveSession: {
        startDate: string | Date;
        durationMinutes: number;
        zoomMeetingLink: string;
        zoomRecordingLink?: string;
        isRecordingAvailable: boolean;
    };
    debugTimeOffset?: number; // Minutes offset from current time (dev mode only)
}

type SessionStatus = 'UPCOMING' | 'STARTING_SOON' | 'LIVE_NOW' | 'ENDED';

export const LiveSessionAction = ({ liveSession, debugTimeOffset = 0 }: LiveSessionProps) => {
    const [status, setStatus] = useState<SessionStatus>('UPCOMING');
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const checkStatus = () => {
            // Apply debug time offset (in minutes) if provided
            const now = new Date(Date.now() + debugTimeOffset * 60000);
            const start = new Date(liveSession.startDate);
            const end = new Date(start.getTime() + liveSession.durationMinutes * 60000);
            const tenMinutesBefore = new Date(start.getTime() - 10 * 60000);

            if (now < tenMinutesBefore) {
                setStatus('UPCOMING');
                // Calculate time left
                const diff = start.getTime() - now.getTime();
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                setTimeLeft(`${days}d ${hours}h`);
            } else if (now >= tenMinutesBefore && now < start) {
                setStatus('STARTING_SOON');
                const diff = Math.ceil((start.getTime() - now.getTime()) / 60000);
                setTimeLeft(`${diff} mins`);
            } else if (now >= start && now <= end) {
                setStatus('LIVE_NOW');
            } else {
                setStatus('ENDED');
            }
        };

        // Run initially and every minute
        checkStatus();
        const timer = setInterval(checkStatus, 60000);

        return () => clearInterval(timer);
    }, [liveSession, debugTimeOffset]);

    // 1️⃣ UPCOMING - Workshop is scheduled for later
    if (status === 'UPCOMING') {
        return (
            <div className="text-center w-full">
                <div className="bg-blue-50 text-blue-800 p-3 rounded-lg mb-2">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            {new Date(liveSession.startDate).toLocaleString([], {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                            })}
                        </span>
                    </div>
                    <p className="text-xs text-blue-600">
                        (All times are displayed in your local timezone)
                    </p>
                </div>
                <button
                    disabled
                    className="w-full bg-slate-200 text-slate-500 py-3 rounded-lg cursor-not-allowed font-semibold"
                >
                    Starts in {timeLeft}
                </button>
            </div>
        );
    }

    // 2️⃣ STARTING_SOON - Workshop starts within 10 minutes
    if (status === 'STARTING_SOON') {
        return (
            <button
                onClick={() => window.open(liveSession.zoomMeetingLink, '_blank')}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-bold shadow-lg transition transform hover:scale-105 flex items-center justify-center gap-2"
            >
                <Clock className="w-5 h-5" />
                Join Room (Starts in {timeLeft})
            </button>
        );
    }

    // 3️⃣ LIVE_NOW - Workshop is happening right now! 🔥
    if (status === 'LIVE_NOW') {
        return (
            <button
                onClick={() => window.open(liveSession.zoomMeetingLink, '_blank')}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold shadow-red-500/50 shadow-lg animate-pulse flex items-center justify-center gap-2"
            >
                <Video className="w-5 h-5" />
                🔴 JOIN LIVE WORKSHOP NOW
            </button>
        );
    }

    // 4️⃣ ENDED - Workshop has concluded
    return (
        <div className="w-full">
            {liveSession.isRecordingAvailable && liveSession.zoomRecordingLink ? (
                <button
                    onClick={() => window.open(liveSession.zoomRecordingLink, '_blank')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                >
                    <PlayCircle className="w-5 h-5" />
                    Watch Recording
                </button>
            ) : (
                <button
                    disabled
                    className="w-full bg-gray-100 text-gray-400 py-3 rounded-lg cursor-not-allowed flex items-center justify-center gap-2 border border-gray-200"
                >
                    <Clock className="w-4 h-4" />
                    Recording Processing...
                </button>
            )}
        </div>
    );
};
