import { z } from 'zod';

const envSchema = z.object({
    // Database
    MONGODB_URI: z.string().min(1, 'MongoDB URI is required'),

    // Authentication
    NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
    NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),

    // Cloudinary (optional - for file uploads)
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    // Paymob (optional - for payments)
    PAYMOB_API_KEY: z.string().optional(),
    PAYMOB_INTEGRATION_ID_CARD: z.string().optional(),
    PAYMOB_INTEGRATION_ID_WALLET: z.string().optional(),
    PAYMOB_IFRAME_ID: z.string().optional(),
    PAYMOB_HMAC_SECRET: z.string().optional(),
});

// Validate environment variables at startup
const parseEnv = () => {
    try {
        return envSchema.parse({
            MONGODB_URI: process.env.MONGODB_URI,
            NEXTAUTH_URL: process.env.NEXTAUTH_URL,
            NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
            CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
            CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
            CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
            PAYMOB_API_KEY: process.env.PAYMOB_API_KEY,
            PAYMOB_INTEGRATION_ID_CARD: process.env.PAYMOB_INTEGRATION_ID_CARD,
            PAYMOB_INTEGRATION_ID_WALLET: process.env.PAYMOB_INTEGRATION_ID_WALLET,
            PAYMOB_IFRAME_ID: process.env.PAYMOB_IFRAME_ID,
            PAYMOB_HMAC_SECRET: process.env.PAYMOB_HMAC_SECRET,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            const missingVars = error.errors.map((e) => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
            throw new Error(`❌ Invalid environment variables:\n${missingVars}`);
        }
        throw error;
    }
};

// Export validated and typed environment variables
export const env = parseEnv();

// Type-safe environment variable access
export type Env = z.infer<typeof envSchema>;
