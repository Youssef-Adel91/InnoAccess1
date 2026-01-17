'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import TrainerProfile, { TrainerStatus } from '@/models/TrainerProfile';
import User from '@/models/User';
import { Types } from 'mongoose';

/**
 * Submit trainer application
 * Creates a new TrainerProfile with PENDING status
 */
export async function submitTrainerApplication(data: {
    bio: string;
    linkedInUrl?: string;
    websiteUrl?: string;
    cvUrl: string;
    specialization: string;
}) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'user') {
            throw new Error('You must be logged in as a user to apply');
        }

        await connectDB();

        // Check if user already has a trainer profile
        const existingProfile = await TrainerProfile.findOne({
            userId: session.user.id,
        });

        if (existingProfile) {
            if (existingProfile.status === TrainerStatus.PENDING) {
                throw new Error('You already have a pending application');
            }
            if (existingProfile.status === TrainerStatus.APPROVED) {
                throw new Error('You are already an approved trainer');
            }
            // If rejected, allow reapplication by updating existing profile
            existingProfile.bio = data.bio;
            existingProfile.linkedInUrl = data.linkedInUrl;
            existingProfile.websiteUrl = data.websiteUrl;
            existingProfile.cvUrl = data.cvUrl;
            existingProfile.specialization = data.specialization;
            existingProfile.status = TrainerStatus.PENDING;
            existingProfile.rejectionReason = undefined;

            await existingProfile.save();

            console.log('✅ Trainer application resubmitted:', session.user.id);

            return {
                success: true,
                data: {
                    profile: JSON.parse(JSON.stringify(existingProfile)),
                    message: 'Application resubmitted successfully',
                },
            };
        }

        // Create new trainer profile
        const trainerProfile = await TrainerProfile.create({
            userId: new Types.ObjectId(session.user.id),
            bio: data.bio,
            linkedInUrl: data.linkedInUrl,
            websiteUrl: data.websiteUrl,
            cvUrl: data.cvUrl,
            specialization: data.specialization,
            status: TrainerStatus.PENDING,
        });

        console.log('✅ New trainer application submitted:', session.user.id);

        return {
            success: true,
            data: {
                profile: JSON.parse(JSON.stringify(trainerProfile)),
                message: 'Application submitted successfully. Please wait for admin approval.',
            },
        };
    } catch (error: any) {
        console.error('❌ Submit trainer application error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to submit application',
                code: 'SUBMIT_APPLICATION_ERROR',
            },
        };
    }
}

/**
 * Get current user's trainer profile
 */
export async function getUserTrainerProfile() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            throw new Error('Not authenticated');
        }

        await connectDB();

        const profile = await TrainerProfile.findOne({
            userId: session.user.id,
        }).lean();

        return {
            success: true,
            data: { profile: profile ? JSON.parse(JSON.stringify(profile)) : null },
        };
    } catch (error: any) {
        console.error('❌ Get trainer profile error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to fetch profile',
                code: 'GET_PROFILE_ERROR',
            },
        };
    }
}

/**
 * Approve trainer application (Admin only)
 * Updates TrainerProfile status to APPROVED and User role to 'trainer'
 */
export async function approveTrainer(profileId: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            throw new Error('Unauthorized - admin access required');
        }

        await connectDB();

        // Find the trainer profile
        const profile = await TrainerProfile.findById(profileId);

        if (!profile) {
            throw new Error('Trainer profile not found');
        }

        if (profile.status === TrainerStatus.APPROVED) {
            throw new Error('This application is already approved');
        }

        // Update profile status
        profile.status = TrainerStatus.APPROVED;
        profile.rejectionReason = undefined;
        await profile.save();

        // Update user role to trainer
        await User.findByIdAndUpdate(profile.userId, {
            role: 'trainer',
        });

        console.log('✅ Trainer approved:', profile.userId);

        return {
            success: true,
            data: {
                profile: JSON.parse(JSON.stringify(profile)),
                message: 'Trainer approved successfully',
            },
        };
    } catch (error: any) {
        console.error('❌ Approve trainer error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to approve trainer',
                code: 'APPROVE_TRAINER_ERROR',
            },
        };
    }
}

/**
 * Reject trainer application (Admin only)
 * Updates TrainerProfile status to REJECTED with reason
 */
export async function rejectTrainer(profileId: string, reason: string) {
    try {
        const session = await getServerSession(authOptions);

        if (!session || session.user.role !== 'admin') {
            throw new Error('Unauthorized - admin access required');
        }

        await connectDB();

        const profile = await TrainerProfile.findById(profileId);

        if (!profile) {
            throw new Error('Trainer profile not found');
        }

        if (profile.status === TrainerStatus.REJECTED) {
            throw new Error('This application is already rejected');
        }

        // Update profile status
        profile.status = TrainerStatus.REJECTED;
        profile.rejectionReason = reason;
        await profile.save();

        console.log('✅ Trainer rejected:', profile.userId);

        return {
            success: true,
            data: {
                profile: JSON.parse(JSON.stringify(profile)),
                message: 'Trainer application rejected',
            },
        };
    } catch (error: any) {
        console.error('❌ Reject trainer error:', error);
        return {
            success: false,
            error: {
                message: error.message || 'Failed to reject trainer',
                code: 'REJECT_TRAINER_ERROR',
            },
        };
    }
}
