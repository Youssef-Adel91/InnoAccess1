/**
 * In-Memory Rate Limiter
 * Prevents abuse by limiting requests per IP/identifier
 */

interface RateLimitEntry {
    count: number;
    resetAt: number;
}

class RateLimiter {
    private limits: Map<string, RateLimitEntry> = new Map();
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        // Cleanup expired entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 5 * 60 * 1000);
    }

    /**
     * Check if request is allowed
     * @param key - Unique identifier (IP + endpoint)
     * @param maxAttempts - Maximum attempts allowed
     * @param windowMs - Time window in milliseconds
     * @returns { success: boolean, remaining: number, retryAfter?: number }
     */
    async check(key: string, maxAttempts: number, windowMs: number): Promise<{
        success: boolean;
        remaining: number;
        retryAfter?: number;
    }> {
        const now = Date.now();
        const entry = this.limits.get(key);

        if (!entry || now >= entry.resetAt) {
            // First request or window expired
            this.limits.set(key, {
                count: 1,
                resetAt: now + windowMs,
            });
            return { success: true, remaining: maxAttempts - 1 };
        }

        if (entry.count >= maxAttempts) {
            // Rate limit exceeded
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000); // seconds
            return { success: false, remaining: 0, retryAfter };
        }

        // Increment count
        entry.count++;
        return { success: true, remaining: maxAttempts - entry.count };
    }

    /**
     * Reset rate limit for a specific key
     */
    reset(key: string): void {
        this.limits.delete(key);
    }

    /**
     * Cleanup expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.limits.entries()) {
            if (now >= entry.resetAt) {
                this.limits.delete(key);
            }
        }
    }

    /**
     * Cleanup on shutdown
     */
    destroy(): void {
        clearInterval(this.cleanupInterval);
        this.limits.clear();
    }
}

// Singleton instance
const rateLimiter = new RateLimiter();

/**
 * Rate limiting presets
 */
export const RateLimits = {
    // Registration: 3 attempts per hour per IP
    REGISTER: {
        max: 3,
        window: 60 * 60 * 1000, // 1 hour
    },
    // Login: 5 attempts per minute per IP
    LOGIN: {
        max: 5,
        window: 60 * 1000, // 1 minute
    },
    // Password reset: 3 attempts per 10 minutes
    PASSWORD_RESET: {
        max: 3,
        window: 10 * 60 * 1000, // 10 minutes
    },
    // General API: 100 requests per minute
    API_GENERAL: {
        max: 100,
        window: 60 * 1000, // 1 minute
    },
};

/**
 * Helper function to create rate limit key
 */
export function createRateLimitKey(ip: string, identifier: string): string {
    return `${ip}:${identifier}`;
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
    // Try to get IP from various headers (Vercel, Cloudflare, etc.)
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    // Fallback to 'unknown' if IP can't be determined
    return 'unknown';
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
    key: string,
    maxAttempts: number,
    windowMs: number
): Promise<{
    success: boolean;
    remaining: number;
    retryAfter?: number;
}> {
    return rateLimiter.check(key, maxAttempts, windowMs);
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string): void {
    rateLimiter.reset(key);
}

export default rateLimiter;
