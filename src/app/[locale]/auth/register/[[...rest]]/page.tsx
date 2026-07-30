'use client';

import React from 'react';
import { SignUp } from '@clerk/nextjs';
import { useLocale } from 'next-intl';

export default function RegisterPage() {
    const locale = useLocale();

    return (
        <div className="flex justify-center items-center py-10">
            <SignUp
                path={`/${locale}/auth/register`}
                routing="path"
                signInUrl={`/${locale}/auth/login`}
                fallbackRedirectUrl={`/${locale}/onboarding`}
            />
        </div>
    );
}
