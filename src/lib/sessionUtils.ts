'use client';

/**
 * Helper function to calculate LIVE session state
 * Used in course cards to show dynamic badge
 */

export type SessionState = 'UPCOMING' | 'STARTING_SOON' | 'LIVE' | 'ENDED';

export function getSessionState(startDate: string | Date, durationMinutes: number): SessionState {
    const now = new Date();
    const sessionStart = new Date(startDate);
    const sessionEnd = new Date(sessionStart.getTime() + durationMinutes * 60 * 1000);

    const msUntilStart = sessionStart.getTime() - now.getTime();
    const msUntilEnd = sessionEnd.getTime() - now.getTime();

    if (msUntilEnd < 0) {
        return 'ENDED';
    } else if (msUntilStart <= 0) {
        return 'LIVE';
    } else if (msUntilStart <= 10 * 60 * 1000) { // 10 minutes before
        return 'STARTING_SOON';
    } else {
        return 'UPCOMING';
    }
}

export function getLiveBadge(state: SessionState): { text: string; className: string; emoji: string } {
    switch (state) {
        case 'UPCOMING':
            return {
                text: 'UPCOMING',
                className: 'bg-gray-500 text-white',
                emoji: '⏰',
            };
        case 'STARTING_SOON':
            return {
                text: 'STARTING SOON',
                className: 'bg-yellow-500 text-white animate-pulse',
                emoji: '🟡',
            };
        case 'LIVE':
            return {
                text: 'LIVE NOW',
                className: 'bg-red-500 text-white animate-pulse',
                emoji: '🔴',
            };
        case 'ENDED':
            return {
                text: 'ENDED',
                className: 'bg-green-600 text-white',
                emoji: '✅',
            };
    }
}
