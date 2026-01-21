import crypto from 'crypto';

/**
 * OTP Utility for Email Verification
 * Generates and verifies 6-digit OTP codes
 */

/**
 * Generate a random 6-digit OTP
 * @returns 6-digit string
 */
export function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash an OTP using SHA-256
 * We hash OTPs before storing to prevent database exposure
 * @param otp - Plain OTP to hash
 * @returns Hashed OTP
 */
export function hashOTP(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Verify an OTP against a hashed OTP
 * @param inputOTP - OTP entered by user
 * @param hashedOTP - Hashed OTP from database
 * @returns True if OTP matches
 */
export function verifyOTP(inputOTP: string, hashedOTP: string): boolean {
    const hashedInput = hashOTP(inputOTP);
    return hashedInput === hashedOTP;
}

/**
 * Check if OTP has expired
 * @param expiryDate - Expiry date from database
 * @returns True if expired
 */
export function isOTPExpired(expiryDate: Date): boolean {
    return new Date() > expiryDate;
}
