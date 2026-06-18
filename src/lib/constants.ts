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
} as const;

// ─── Type Helpers ──────────────────────────────────────────────────────────────
export type SocialPlatform = keyof typeof SOCIAL_LINKS;
