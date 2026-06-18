/**
 * src/i18n/navigation.ts
 *
 * Typed navigation helpers from next-intl.
 * Use these INSTEAD of Next.js's native Link, useRouter, usePathname, and
 * redirect when navigating between locale-aware pages.
 *
 * Why:
 *  - next-intl's versions automatically prepend the active locale prefix.
 *  - TypeScript enforces that only valid href paths are passed.
 *
 * Usage in Client Components:
 *   import { Link, useRouter, usePathname } from '@/i18n/navigation';
 *
 * Usage in Server Components / redirect:
 *   import { redirect } from '@/i18n/navigation';
 */
import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, useRouter, usePathname, redirect } =
    createNavigation(routing);
