/**
 * Cloudflare Turnstile Integration
 * Privacy-focused CAPTCHA alternative with better accessibility
 */

interface TurnstileVerificationResponse {
    success: boolean;
    'error-codes'?: string[];
    challenge_ts?: string;
    hostname?: string;
}

/**
 * Verify Turnstile token on server-side
 * @param token - Token from client-side widget
 * @param remoteIP - Client IP address (optional)
 * @returns Promise<boolean> - true if verification successful
 */
export async function verifyTurnstileToken(
    token: string,
    remoteIP?: string
): Promise<{ success: boolean; error?: string }> {
    // Skip verification in development if no secret key
    if (process.env.NODE_ENV === 'development' && !process.env.TURNSTILE_SECRET_KEY) {
        console.warn('⚠️ Turnstile verification skipped (no secret key in development)');
        return { success: true };
    }

    if (!process.env.TURNSTILE_SECRET_KEY) {
        console.error('❌ TURNSTILE_SECRET_KEY is not configured');
        return { success: false, error: 'CAPTCHA verification not configured' };
    }

    if (!token) {
        return { success: false, error: 'CAPTCHA token required' };
    }

    try {
        const formData = new URLSearchParams();
        formData.append('secret', process.env.TURNSTILE_SECRET_KEY);
        formData.append('response', token);
        if (remoteIP) {
            formData.append('remoteip', remoteIP);
        }

        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const data: TurnstileVerificationResponse = await response.json();

        if (!data.success) {
            console.error('❌ Turnstile verification failed:', data['error-codes']);
            return {
                success: false,
                error: 'CAPTCHA verification failed. Please try again.',
            };
        }

        console.log('✅ Turnstile verification successful');
        return { success: true };
    } catch (error: any) {
        console.error('❌ Turnstile verification error:', error.message);
        return {
            success: false,
            error: 'CAPTCHA verification error. Please try again.',
        };
    }
}

/**
 * Get Turnstile site key for client-side widget
 */
export function getTurnstileSiteKey(): string | undefined {
    return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}
