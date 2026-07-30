'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';
import { useLocale } from 'next-intl';

export default function SignInPage() {
    const locale = useLocale();

    return (
        <div className="flex justify-center items-center py-10">
            <SignIn
                path={`/${locale}/auth/signin`}
                routing="path"
                signUpUrl={`/${locale}/auth/register`}
                fallbackRedirectUrl={`/${locale}/onboarding`}
            />
        </div>
    );
}
