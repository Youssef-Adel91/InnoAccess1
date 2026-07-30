'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';
import { useLocale } from 'next-intl';

export default function LoginPage() {
    const locale = useLocale();

    return (
        <div className="flex justify-center items-center py-10">
            <SignIn
                path={`/${locale}/auth/login`}
                routing="path"
                signUpUrl={`/${locale}/auth/register`}
                fallbackRedirectUrl={`/${locale}/onboarding`}
            />
        </div>
    );
}
