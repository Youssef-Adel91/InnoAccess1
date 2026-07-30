'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';

export type UserRole = 'student' | 'trainer' | 'volunteer' | 'company';

export async function setUserRole(role: UserRole) {
    const { userId } = await auth();

    if (!userId) {
        throw new Error('Unauthorized');
    }

    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
        publicMetadata: {
            role: role,
        },
    });

    return { success: true, role };
}
