import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

/**
 * next-intl server-side request config
 *
 * This file is the integration point between Next.js server components
 * and the translation dictionaries. It runs per-request on the server.
 *
 * next-intl picks this file up automatically when you configure the
 * `next-intl/plugin` in next.config.js.
 *
 * How it works:
 *  1. next-intl reads the `locale` from the URL segment ([locale] param).
 *  2. This function dynamically imports the correct messages/XX.json file.
 *  3. The messages are made available to all Server and Client Components
 *     via <NextIntlClientProvider> in the [locale]/layout.tsx.
 */
export default getRequestConfig(async ({ requestLocale }) => {
    // requestLocale is the locale string extracted from the URL segment.
    // Validate it against the routing config before trusting it.
    let locale = await requestLocale;

    // Fall back to defaultLocale if the extracted locale is invalid.
    if (!locale || !routing.locales.includes(locale as 'en' | 'ar')) {
        locale = routing.defaultLocale;
    }

    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
    };
});
