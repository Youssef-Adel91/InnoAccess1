/**
 * Payment Configuration Constants
 */

// InstaPay / Vodafone Cash phone number for manual transfers
export const INSTAPAY_PHONE_NUMBER = '01002804304';

// Payment methods
export const PAYMENT_METHODS = {
    PAYMOB: 'PAYMOB',
    MANUAL: 'MANUAL',
} as const;

// Order status
export const ORDER_STATUS = {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    REJECTED: 'REJECTED',
} as const;

// Paymob payment types
export const PAYMOB_PAYMENT_TYPES = {
    CARD: 'CARD',
    WALLET: 'WALLET',
} as const;

// Receipt upload config
export const RECEIPT_UPLOAD = {
    MAX_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/jpg'],
} as const;

// Currency
export const CURRENCY = 'EGP';
