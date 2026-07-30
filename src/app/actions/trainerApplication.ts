'use server';

import { currentUser } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import TrainerProfile, { TrainerStatus } from '@/models/TrainerProfile';
import User from '@/models/User';
import { Types } from 'mongoose';
import { sendEmail, getTrainerApprovalEmailTemplate, getTrainerRejectionEmailTemplate } from '@/lib/mail';

/**
 * Helper: Resolve MongoDB User document from Clerk currentUser
 */
async function getMongoUserFromClerk(clerkUser: any) {
    const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().trim();
    if (!email) throw new Error('No valid email found on account');

    await connectDB();
    let user = await User.findOne({ email });

    if (!user) {
        user = await User.create({
            name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'Student',
            email,
            role: 'user',
        });
    }

    return user;
}

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
        const clerkUser = await currentUser();
        if (!clerkUser) {
            throw new Error('You must be logged in to apply');
        }

        const mongoUser = await getMongoUserFromClerk(clerkUser);

        // Check if user already has a trainer profile
        const existingProfile = await TrainerProfile.findOne({
            userId: mongoUser._id,
        });

        if (existingProfile) {
            if (existingProfile.status === TrainerStatus.APPROVED) {
                throw new Error('You are already an approved trainer');
            }
            if (existingProfile.status === TrainerStatus.PENDING) {
                throw new Error('You already have a pending application');
            }
            // If rejected, allow resubmission after 24 hours
            if (existingProfile.status === TrainerStatus.REJECTED) {
                if (existingProfile.rejectedAt) {
                    const hoursSinceRejection =
                        (Date.now() - existingProfile.rejectedAt.getTime()) / (1000 * 60 * 60);
                    if (hoursSinceRejection < 24) {
                        const hoursRemaining = Math.ceil(24 - hoursSinceRejection);
                        throw new Error(
                            `Please wait ${hoursRemaining} hour(s) before resubmitting your application.`
                        );
                    }
                }

                // Resubmit application
                existingProfile.bio = data.bio;
                existingProfile.linkedInUrl = data.linkedInUrl;
                existingProfile.websiteUrl = data.websiteUrl;
                existingProfile.cvUrl = data.cvUrl;
                existingProfile.specialization = data.specialization;
                existingProfile.status = TrainerStatus.PENDING;
                existingProfile.rejectionReason = undefined;
                existingProfile.rejectedAt = undefined;

                await existingProfile.save();

                console.log('✅ Trainer application resubmitted:', mongoUser._id);

                return {
                    success: true,
                    data: {
                        profile: JSON.parse(JSON.stringify(existingProfile)),
                        message: 'Application resubmitted successfully',
                    },
                };
            }
        }

        // Create new trainer profile
        const trainerProfile = await TrainerProfile.create({
            userId: mongoUser._id,
            bio: data.bio,
            linkedInUrl: data.linkedInUrl,
            websiteUrl: data.websiteUrl,
            cvUrl: data.cvUrl,
            specialization: data.specialization,
            status: TrainerStatus.PENDING,
        });

        console.log('✅ New trainer application submitted:', mongoUser._id);

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
        const clerkUser = await currentUser();
        if (!clerkUser) {
            throw new Error('Not authenticated');
        }

        const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().trim();
        await connectDB();

        const mongoUser = await User.findOne({ email });
        if (!mongoUser) {
            return {
                success: true,
                data: { profile: null },
            };
        }

        const profile = await TrainerProfile.findOne({
            userId: mongoUser._id,
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
 */
export async function approveTrainer(profileId: string) {
    try {
        const clerkUser = await currentUser();
        const userRole = (clerkUser?.publicMetadata as { role?: string })?.role;

        if (!clerkUser || userRole !== 'admin') {
            throw new Error('Unauthorized - admin access required');
        }

        await connectDB();

        const profile = await TrainerProfile.findById(profileId);
        if (!profile) {
            throw new Error('Trainer profile not found');
        }

        if (profile.status === TrainerStatus.APPROVED) {
            throw new Error('This application is already approved');
        }

        profile.status = TrainerStatus.APPROVED;
        profile.rejectionReason = undefined;
        await profile.save();

        await User.findByIdAndUpdate(profile.userId, {
            role: 'trainer',
        });

        console.log('✅ Trainer approved:', profile.userId);

        try {
            const populatedProfile = await TrainerProfile.findById(profileId)
                .populate('userId', 'name email')
                .lean();

            if (populatedProfile?.userId && typeof populatedProfile.userId === 'object' && 'email' in populatedProfile.userId && populatedProfile.userId.email) {
                const userName = ('name' in populatedProfile.userId ? populatedProfile.userId.name : 'Trainer') as string;
                const emailHtml = getTrainerApprovalEmailTemplate(userName);

                await sendEmail({
                    to: populatedProfile.userId.email as string,
                    subject: '🎉 Trainer Application Approved - Welcome to InnoAccess!',
                    html: emailHtml,
                });
            }
        } catch (emailError) {
            console.error('❌ Error sending approval email:', emailError);
        }

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
 */
export async function rejectTrainer(profileId: string, reason: string) {
    try {
        const clerkUser = await currentUser();
        const userRole = (clerkUser?.publicMetadata as { role?: string })?.role;

        if (!clerkUser || userRole !== 'admin') {
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

        if (profile.cvUrl) {
            try {
                const { del } = await import('@vercel/blob');
                await del(profile.cvUrl);
                console.log('🗑️ CV deleted from Vercel Blob:', profile.cvUrl);
            } catch (blobError) {
                console.error('⚠️ Failed to delete CV from Blob (continuing anyway):', blobError);
            }
        }

        profile.status = TrainerStatus.REJECTED;
        profile.rejectionReason = reason;
        profile.cvUrl = undefined as any;
        profile.rejectedAt = new Date();
        await profile.save({ validateBeforeSave: false });

        console.log('✅ Trainer rejected:', profile.userId);

        try {
            const populatedProfile = await TrainerProfile.findById(profileId)
                .populate('userId', 'name email')
                .lean();

            if (populatedProfile?.userId && typeof populatedProfile.userId === 'object' && 'email' in populatedProfile.userId && populatedProfile.userId.email) {
                const userName = ('name' in populatedProfile.userId ? populatedProfile.userId.name : 'User') as string;
                const emailHtml = getTrainerRejectionEmailTemplate(userName);

                await sendEmail({
                    to: populatedProfile.userId.email as string,
                    subject: '❌ Trainer Application Update - InnoAccess',
                    html: emailHtml,
                });
            }
        } catch (emailError) {
            console.error('❌ Error sending rejection email:', emailError);
        }

        try {
            const { createNotification } = await import('@/lib/notifications');
            const { NotificationType } = await import('@/models/Notification');
            await createNotification({
                userId: profile.userId.toString(),
                type: NotificationType.TRAINER_REJECTED,
                title: 'Trainer Application Rejected',
                message: `Unfortunately, your trainer application has been rejected. Reason: ${reason}. You can reapply after 24 hours.`,
                link: '/trainer/apply',
            });
        } catch (notifError) {
            console.error('❌ Error creating rejection notification:', notifError);
        }

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
