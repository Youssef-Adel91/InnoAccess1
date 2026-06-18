import { defineRouting } from 'next-intl/routing';

/**
 * next-intl routing configuration
 *
 * locales:        All supported locales — English (default) and Arabic.
 * defaultLocale:  'en' — used as fallback when no locale is detected.
 * localePrefix:   'always' — every URL includes the locale prefix:
 *                   /en/ (English) and /ar/ (Arabic).
 *                 The root / automatically redirects to /en/.
 *
 * This file is imported by:
 *  - src/middleware.ts      (to configure the intl middleware)
 *  - src/i18n/request.ts   (to provide locale-aware message loading)
 *  - src/i18n/navigation.ts (for typed Link / useRouter / usePathname)
 */
export const routing = defineRouting({
    locales: ['en', 'ar'],
    defaultLocale: 'en',
    localePrefix: 'always',
});
