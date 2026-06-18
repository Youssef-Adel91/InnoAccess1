/**
 * Company-wide constants for InnoAccess.
 *
 * Keep all hardcoded external URLs here so they are easy to update in one
 * place and are statically type-checked at build time.
 */

// ─── InnoAccess Official Social Media Profiles ────────────────────────────────
export const SOCIAL_LINKS = {
    facebook: 'https://www.facebook.com/profile.php?id=61576308900499&locale=ar_AR',
    linkedin:  'https://www.linkedin.com/company/inno-access/?viewAsMember=true',
    whatsapp: 'https://chat.whatsapp.com/GJO20TqfsunFgqZ437gJ6e',
    tiktok: 'https://www.tiktok.com/@inno.access?_r=1&_t=ZS-97JSIQlLyuA',
} as const;

// ─── Type Helpers ──────────────────────────────────────────────────────────────
export type SocialPlatform = keyof typeof SOCIAL_LINKS;
