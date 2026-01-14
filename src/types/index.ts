/**
 * Global type definitions for InnoAccess
 */

/**
 * User roles in the system
 */
export enum UserRole {
    USER = 'user',          // Normal users (candidates/learners)
    COMPANY = 'company',    // Employers
    TRAINER = 'trainer',    // Course instructors
    ADMIN = 'admin',        // System administrators
}

/**
 * Base user type
 */
export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    accessibilitySettings?: AccessibilitySettings;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Accessibility preferences for users
 */
export interface AccessibilitySettings {
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    highContrast: boolean;
    reduceMotion: boolean;
    screenReaderOptimized: boolean;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
    };
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    meta: PaginationMeta;
}
