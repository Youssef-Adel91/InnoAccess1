import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB } from './db';
import User from '@/models/User';
import { verifyPassword } from './auth-utils';

/**
 * NextAuth Configuration — Credentials-only (Google OAuth disabled)
 *
 * Google OAuth was removed due to persistent Vercel production edge-cases
 * (hydration mismatches, session serialization bugs, E11000 collisions).
 * Authentication now uses the stable, self-contained CredentialsProvider
 * backed directly by our MongoDB User collection.
 *
 * Role is captured upfront at registration — no post-login onboarding needed.
 */
export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password are required');
                }

                try {
                    await connectDB();

                    // Find user by email (include password for verification)
                    const user = await User.findOne({ email: credentials.email }).select('+password');

                    if (!user) {
                        throw new Error('Invalid email or password');
                    }

                    // Account has no password (was a Google-only account)
                    if (!user.password) {
                        throw new Error('This account was created via a different sign-in method. Please contact support.');
                    }

                    // Verify password
                    const isValid = await verifyPassword(credentials.password, user.password);

                    if (!isValid) {
                        throw new Error('Invalid email or password');
                    }

                    // isVerified check removed — all new users are auto-verified at registration.
                    // Legacy users with isVerified:false can still sign in.

                    // Check if user is active
                    if (!user.isActive) {
                        throw new Error('Your account has been deactivated');
                    }

                    // Check if company is approved
                    if (user.role === 'company' && !user.isApproved) {
                        throw new Error('Your company account is pending admin approval');
                    }

                    return {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        isApproved: user.isApproved,
                        needsOnboarding: false, // Credentials users always have a role at signup
                    };
                } catch (error: any) {
                    throw new Error(error.message || 'Authentication failed');
                }
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user, trigger }) {
            // ── First sign-in: populate token from authorize() return ──────────
            if (user) {
                token.id             = user.id ?? '';
                token.role           = user.role ?? 'user';
                token.isApproved     = user.isApproved ?? false;
                token.needsOnboarding = false; // Always false for credentials users
                token.authProvider   = 'credentials';
            }

            // ── Session update trigger: re-read DB to pick up role changes ─────
            if (trigger === 'update' && token.id) {
                try {
                    await connectDB();
                    const dbUser = await User.findById(token.id).lean();
                    if (dbUser) {
                        token.role           = dbUser.role           ?? 'user';
                        token.needsOnboarding = dbUser.needsOnboarding ?? false;
                        token.isApproved     = dbUser.isApproved     ?? false;
                    }
                } catch (e) {
                    console.error('JWT_UPDATE_TRIGGER_ERROR:', e);
                }
            }

            return token;
        },

        async session({ session, token }) {
            // Map every typed JWT field → session.user with safe ?? fallbacks
            if (session.user) {
                session.user.id              = token.id            ?? '';
                session.user.role            = token.role           ?? 'user';
                session.user.isApproved      = token.isApproved     ?? false;
                session.user.needsOnboarding = token.needsOnboarding ?? false;
                session.user.authProvider    = token.authProvider;
            }
            return session;
        },
    },

    pages: {
        signIn: '/auth/signin',
        signOut: '/auth/signout',
        error: '/auth/error',
    },

    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },

    secret: process.env.NEXTAUTH_SECRET,
};
