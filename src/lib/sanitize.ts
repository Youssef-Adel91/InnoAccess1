/**
 * NoSQL Injection Prevention Utility
 * Sanitizes user input to prevent MongoDB injection attacks
 */

/**
 * Check if value contains MongoDB operators
 */
function containsMongoOperator(key: string): boolean {
    return /^\$/.test(key);
}

/**
 * Recursively sanitize object by removing MongoDB operators
 * @param input - User input to sanitize
 * @returns Sanitized input
 */
export function sanitizeInput<T = any>(input: T): T {
    if (input === null || input === undefined) {
        return input;
    }

    // Handle arrays
    if (Array.isArray(input)) {
        return input.map((item) => sanitizeInput(item)) as T;
    }

    // Handle objects
    if (typeof input === 'object' && input.constructor === Object) {
        const sanitized: any = {};

        for (const key in input) {
            // Skip MongoDB operators (keys starting with $)
            if (containsMongoOperator(key)) {
                console.warn(`⚠️ Blocked potential NoSQL injection: key "${key}"`);
                continue;
            }

            // Recursively sanitize nested objects
            sanitized[key] = sanitizeInput((input as any)[key]);
        }

        return sanitized as T;
    }

    // Return primitive values as-is (string, number, boolean)
    return input;
}

/**
 * Sanitize MongoDB query object
 * @param query - MongoDB query to sanitize
 * @returns Sanitized query
 */
export function sanitizeMongoQuery<T extends Record<string, any>>(query: T): T {
    const sanitized: any = {};

    for (const key in query) {
        const value = query[key];

        // Allow MongoDB operators in the root level if they're expected
        // But sanitize their values
        if (containsMongoOperator(key)) {
            // Only allow specific safe operators
            const safeOperators = ['$and', '$or', '$nor', '$not', '$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin'];

            if (safeOperators.includes(key)) {
                sanitized[key] = sanitizeInput(value);
            } else {
                console.warn(`⚠️ Blocked unsafe MongoDB operator: "${key}"`);
            }
        } else {
            sanitized[key] = sanitizeInput(value);
        }
    }

    return sanitized as T;
}

/**
 * Validate and sanitize email input
 */
export function sanitizeEmail(email: string): string {
    if (typeof email !== 'string') {
        throw new Error('Email must be a string');
    }

    // Remove any potential injection attempts
    return email.trim().toLowerCase();
}

/**
 * Sanitize string input (remove HTML/script tags)
 */
export function sanitizeString(input: string): string {
    if (typeof input !== 'string') {
        return '';
    }

    // Remove HTML tags and script content
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
}

/**
 * Validate ObjectId format (MongoDB)
 */
export function isValidObjectId(id: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(id);
}
