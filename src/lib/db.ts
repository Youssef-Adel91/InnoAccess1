import mongoose from 'mongoose';
import { env } from './env';

/**
 * Global connection cache to prevent multiple connections in serverless environments
 * This is necessary because Next.js API routes are stateless and can create
 * multiple database connections if not properly cached.
 */
declare global {
    // eslint-disable-next-line no-var
    var mongooseCache: {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
    };
}

let cached = global.mongooseCache;

if (!cached) {
    cached = global.mongooseCache = { conn: null, promise: null };
}

/**
 * Connects to MongoDB with connection caching
 * @returns {Promise<typeof mongoose>} Mongoose instance
 */
export async function connectDB(): Promise<typeof mongoose> {
    // Return existing connection if available
    if (cached.conn) {
        console.log('📦 Using cached database connection');
        return cached.conn;
    }

    // Return existing connection promise if in progress
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            maxPoolSize: 10,
            minPoolSize: 5,
            socketTimeoutMS: 45000,
        };

        console.log('🔌 Connecting to MongoDB...');
        cached.promise = mongoose.connect(env.MONGODB_URI, opts).then((mongoose) => {
            console.log('✅ MongoDB connected successfully');
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        console.error('❌ MongoDB connection error:', error);
        throw error;
    }

    return cached.conn;
}

/**
 * Disconnects from MongoDB (mainly for testing or cleanup)
 */
export async function disconnectDB(): Promise<void> {
    if (cached.conn) {
        await cached.conn.disconnect();
        cached.conn = null;
        cached.promise = null;
        console.log('🔌 Disconnected from MongoDB');
    }
}

/**
 * Check database connection status
 */
export function isConnected(): boolean {
    return mongoose.connection.readyState === 1;
}
