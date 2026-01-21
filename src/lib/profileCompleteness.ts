import { IUser, IUserProfile } from '@/models/User';

/**
 * Profile Completeness Result
 */
export interface ProfileCompletenessResult {
    percentage: number; // 0-100
    completedFields: string[];
    missingFields: string[];
    totalFields: number;
    filledFields: number;
}

/**
 * Calculate profile completeness percentage for users
 * 
 * @param user - User object from database
 * @returns ProfileCompletenessResult with percentage and missing fields
 * 
 * @note Only applicable for 'user' role (not company/trainer/admin)
 */
export function calculateProfileCompleteness(user: IUser): ProfileCompletenessResult {
    // Define what makes a "complete" profile for job seekers
    const essentialFields = {
        bio: user.profile?.bio,
        phone: user.profile?.phone,
        location: user.profile?.location,
        linkedin: user.profile?.linkedin,
        avatar: user.profile?.avatar,
    };

    const completedFields: string[] = [];
    const missingFields: string[] = [];

    // Check each field
    Object.entries(essentialFields).forEach(([fieldName, value]) => {
        if (value && value.trim().length > 0) {
            completedFields.push(fieldName);
        } else {
            missingFields.push(fieldName);
        }
    });

    const totalFields = Object.keys(essentialFields).length;
    const filledFields = completedFields.length;
    const percentage = Math.round((filledFields / totalFields) * 100);

    return {
        percentage,
        completedFields,
        missingFields,
        totalFields,
        filledFields,
    };
}

/**
 * Get user-friendly field names for display
 */
export const fieldDisplayNames: Record<string, string> = {
    bio: 'Bio / About Me',
    phone: 'Phone Number',
    location: 'Location',
    linkedin: 'LinkedIn Profile',
    avatar: 'Profile Picture',
};

/**
 * Get profile completion tips based on missing fields
 */
export function getCompletionTips(missingFields: string[]): string[] {
    const tips: string[] = [];

    missingFields.forEach((field) => {
        switch (field) {
            case 'bio':
                tips.push('Add a brief bio to introduce yourself to employers');
                break;
            case 'phone':
                tips.push('Add your phone number so companies can reach you');
                break;
            case 'location':
                tips.push('Specify your location to find nearby opportunities');
                break;
            case 'linkedin':
                tips.push('Link your LinkedIn to showcase your professional network');
                break;
            case 'avatar':
                tips.push('Upload a profile picture to make a great first impression');
                break;
        }
    });

    return tips;
}

/**
 * Determine profile strength level
 */
export function getProfileStrength(percentage: number): {
    level: 'weak' | 'fair' | 'good' | 'excellent';
    color: string;
    message: string;
} {
    if (percentage < 40) {
        return {
            level: 'weak',
            color: 'text-red-600',
            message: 'Your profile needs work. Complete it to unlock better opportunities!',
        };
    } else if (percentage < 70) {
        return {
            level: 'fair',
            color: 'text-yellow-600',
            message: 'Good start! Add more details to stand out to employers.',
        };
    } else if (percentage < 100) {
        return {
            level: 'good',
            color: 'text-blue-600',
            message: 'Almost there! Complete the remaining fields to maximize your chances.',
        };
    } else {
        return {
            level: 'excellent',
            color: 'text-green-600',
            message: '🎉 Perfect! Your profile is complete and ready to impress employers.',
        };
    }
}
