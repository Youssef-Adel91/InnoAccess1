'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';

export function SessionProvider({ children }: { children: React.ReactNode }) {
    return (
        <NextAuthSessionProvider
            refetchOnWindowFocus={false}  // 👈 Prevents refetch when switching tabs
            refetchInterval={0}            // 👈 Disables periodic session checks
        >
            {children}
        </NextAuthSessionProvider>
    );
}
