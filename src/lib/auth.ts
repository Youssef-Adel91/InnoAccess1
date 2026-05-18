import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { connectDB } from './db';
import User from '@/models/User';
import { verifyPassword } from './auth-utils';

/**
 * NextAuth Configuration
 */
export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
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
                    // Connect to database
                    await connectDB();

                    // Find user by email (include password for verification)
                    const user = await User.findOne({ email: credentials.email }).select('+password');

                    if (!user) {
                        throw new Error('Invalid email or password');
                    }

                    // Verify password
                    const isValid = await verifyPassword(credentials.password, user.password);

                    if (!isValid) {
                        throw new Error('Invalid email or password');
                    }

                    // Check if email is verified
                    if (!user.isVerified) {
                        throw new Error('Please verify your email before signing in. Check your inbox for the verification code.');
                    }

                    // Check if user is active
                    if (!user.isActive) {
                        throw new Error('Your account has been deactivated');
                    }

                    // Check if company is approved
                    if (user.role === 'company' && !user.isApproved) {
                        throw new Error('Your company account is pending admin approval');
                    }

                    // Return user object (password will be excluded by toJSON)
                    return {
                        id: user._id.toString(),
                        email: user.email,
                        name: user.name,
                        role: user.role,
                        isApproved: user.isApproved,
                    };
                } catch (error: any) {
                    throw new Error(error.message || 'Authentication failed');
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // Handle Google OAuth sign-in: upsert user in DB
            if (account?.provider === 'google') {
                try {
                    await connectDB();
                    const existingUser = await User.findOne({ email: user.email });
                    if (!existingUser) {
                        // Sanitize name: Google may return very short display names
                        const safeName = (user.name || user.email?.split('@')[0] || 'User').trim();

                        const newUser = await User.create({
                            name: safeName,
                            email: user.email,
                            authProvider: 'google', // ← Tells schema NOT to require password
                            role: 'user',
                            isVerified: true,
                            isActive: true,
                            isApproved: false,
                            needsOnboarding: true,
                        });
                        // Tag the user object so jwt callback knows this is new
                        (user as any).needsOnboarding = true;
                        (user as any).dbId = newUser._id.toString();
                    } else {
                        (user as any).needsOnboarding = existingUser.needsOnboarding ?? false;
                        (user as any).dbId = existingUser._id.toString();
                    }
                    return true;
                } catch (error: any) {
                    // Deep log so the full Mongoose/DB error appears in Vercel function logs
                    console.error(
                        'OAUTH_SIGNIN_ERROR:',
                        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
                    );
                    return false; // Returns AccessDenied to the client, but root cause is now in logs
                }
            }
            return true;
        },
        async jwt({ token, user, account, trigger }) {
            // On first sign-in, populate token from DB for both providers
            if (user) {
                if (account?.provider === 'google') {
                    token.id = (user as any).dbId;
                    token.needsOnboarding = (user as any).needsOnboarding ?? false;
                    await connectDB();
                    const dbUser = await User.findById(token.id);
                    if (dbUser) {
                        token.role = dbUser.role;
                        token.isApproved = dbUser.isApproved;
                    }
                } else {
                    token.id = user.id;
                    token.role = user.role;
                    token.isApproved = user.isApproved;
                    token.needsOnboarding = false;
                }
            }
            // Allow session update trigger to refresh onboarding flag
            if (trigger === 'update' && token.id) {
                await connectDB();
                const dbUser = await User.findById(token.id);
                if (dbUser) {
                    token.role = dbUser.role;
                    token.needsOnboarding = dbUser.needsOnboarding ?? false;
                    token.isApproved = dbUser.isApproved;
                }
            }
            return token;
        },
        async session({ session, token }) {
            // Add user info to session
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
                session.user.isApproved = token.isApproved as boolean;
                (session.user as any).needsOnboarding = token.needsOnboarding as boolean;
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
