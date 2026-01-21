import mongoose, { Schema, Model, Document } from 'mongoose';

/**
 * User Roles Enum
 */
export enum UserRole {
    USER = 'user',
    COMPANY = 'company',
    TRAINER = 'trainer',
    ADMIN = 'admin',
}

/**
 * Accessibility Settings Interface
 */
export interface IAccessibilitySettings {
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    highContrast: boolean;
    reduceMotion: boolean;
    screenReaderOptimized: boolean;
}

/**
 * User Profile Interface
 */
export interface IUserProfile {
    bio?: string;
    phone?: string;
    location?: string;
    website?: string;
    avatar?: string; // Cloudinary URL
    companyName?: string; // For company users
    companyLogo?: string; // For company users
    companyBio?: string; // For company users - description for admin review
    facebook?: string; // Social media links
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    accessibilityScore?: number; // For company users (1-10)
}

/**
 * User Document Interface
 */
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    profile?: IUserProfile;
    accessibilitySettings: IAccessibilitySettings;
    isApproved: boolean; // For company accounts
    isActive: boolean;
    resetPasswordToken?: string; // For password reset flow
    resetPasswordExpires?: Date; // Token expiry (1 hour)
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Accessibility Settings Schema
 */
const AccessibilitySettingsSchema = new Schema<IAccessibilitySettings>({
    fontSize: {
        type: String,
        enum: ['small', 'medium', 'large', 'extra-large'],
        default: 'medium',
    },
    highContrast: {
        type: Boolean,
        default: false,
    },
    reduceMotion: {
        type: Boolean,
        default: false,
    },
    screenReaderOptimized: {
        type: Boolean,
        default: false,
    },
});

/**
 * User Profile Schema
 */
const UserProfileSchema = new Schema<IUserProfile>({
    bio: String,
    phone: String,
    location: String,
    website: String,
    avatar: String,
    companyName: String,
    companyLogo: String,
    companyBio: String, // Company description for admin review
    facebook: String,
    linkedin: String,
    twitter: String,
    instagram: String,
    accessibilityScore: {
        type: Number,
        min: 1,
        max: 10,
    },
});

/**
 * User Schema
 */
const UserSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [100, 'Name cannot exceed 100 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false, // Don't return password by default
        },
        role: {
            type: String,
            enum: Object.values(UserRole),
            default: UserRole.USER,
        },
        profile: {
            type: UserProfileSchema,
            default: {},
        },
        accessibilitySettings: {
            type: AccessibilitySettingsSchema,
            default: {},
        },
        isApproved: {
            type: Boolean,
            default: function (this: IUser) {
                // Companies require approval, others are auto-approved
                return this.role !== UserRole.COMPANY;
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        resetPasswordToken: {
            type: String,
            select: false, // Don't return by default
        },
        resetPasswordExpires: {
            type: Date,
            select: false, // Don't return by default
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
// Note: email index is automatically created by unique: true constraint
UserSchema.index({ role: 1 });
UserSchema.index({ isApproved: 1, role: 1 });

// Prevent returning password in JSON
UserSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
};

/**
 * User Model
 */
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
