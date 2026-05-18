import 'next-auth';
import { UserRole } from '@/models/User';

declare module 'next-auth' {
    interface User {
        id: string;
        role: UserRole | string;
        isApproved: boolean;
    }

    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role: UserRole | string;
            isApproved: boolean;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role: UserRole | string;
        isApproved: boolean;
    }
}
