/**
 * NextAuth Global Type Augmentations
 *
 * These declarations extend the default NextAuth interfaces to include
 * custom fields used throughout the InnoAccess platform.
 *
 * CRITICAL: All fields on Session.user, JWT, and User MUST be declared here.
 * Missing declarations cause TypeScript to silently treat fields as `any`,
 * which can crash the useSession hook in production (strict mode strips
 * unknown properties from serialized JWT payloads in some environments).
 */

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
    /**
     * Extends the built-in User object returned by provider callbacks.
     * This is the raw user object passed to the jwt() callback on first sign-in.
     */
    interface User {
        id: string;
        role: string;
        isApproved: boolean;
        needsOnboarding: boolean;
        authProvider?: 'credentials' | 'google';
    }

    /**
     * Extends the Session.user object available to useSession() and getServerSession().
     * All fields here are serialized into the JWT and sent to the client.
     */
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role: string;
            isApproved: boolean;
            needsOnboarding: boolean;
            authProvider?: 'credentials' | 'google';
        };
    }
}

declare module 'next-auth/jwt' {
    /**
     * Extends the JWT payload stored server-side and decoded in middleware.
     * MUST match the fields written in the jwt() callback in src/lib/auth.ts.
     */
    interface JWT {
        id: string;
        role: string;
        isApproved: boolean;
        needsOnboarding: boolean;
        authProvider?: 'credentials' | 'google';
    }
}
