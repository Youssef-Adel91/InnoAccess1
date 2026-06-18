import mongoose from 'mongoose';
import { env } from './env';

// Pre-register all models to prevent "MissingSchemaError" in Next.js Serverless environments
// when calling .populate() in isolated API routes
import '@/models/User';
import '@/models/Category';
import '@/models/Course';
import '@/models/Job';
import '@/models/Application';
import '@/models/Enrollment';
import '@/models/Order';
import '@/models/Notification';
import '@/models/TrainerProfile';
// Affiliate Marketing models
import '@/models/Commission';
import '@/models/Wallet';
import '@/models/Payout';

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
            // ── Pool sizing for serverless ─────────────────────────────────────
            // Each Vercel function instance is ephemeral; a large pool wastes
            // Atlas connection slots. 5 max is the recommended serverless sweet-spot.
            maxPoolSize: 5,
            minPoolSize: 1,
            // ── Timeout ladder ────────────────────────────────────────────────
            // serverSelectionTimeoutMS: how long the driver waits to find a
            // suitable server before throwing. 10s is generous for cold starts.
            serverSelectionTimeoutMS: 10_000,
            // connectTimeoutMS: TCP handshake timeout per socket.
            connectTimeoutMS: 10_000,
            // socketTimeoutMS: how long to wait on an open socket for a response.
            socketTimeoutMS: 45_000,
            // heartbeatFrequencyMS: how often the driver pings the server to
            // keep the connection alive in the pool (default 10s, lowered to 5s
            // to detect stale Cloudflare-proxied connections faster).
            heartbeatFrequencyMS: 5_000,
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
