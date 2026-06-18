/**
 * resumeSchemas.ts — Per-step Zod validation schemas for the Resume Wizard
 *
 * Each schema is scoped to exactly the fields rendered in that wizard step.
 * React Hook Form uses these via @hookform/resolvers/zod.
 *
 * ─── Date format ─────────────────────────────────────────────────────────────
 * Dates are stored as "MM/YYYY" strings. The regex `DATE_REGEX` enforces this.
 * We use strings (not Date objects) because resumes use partial dates
 * (month + year only — no day).
 */

import { z } from 'zod';

// ─── Shared validators ────────────────────────────────────────────────────────

const DATE_REGEX = /^\d{2}\/\d{4}$/;

const dateString = z
    .string()
    .regex(DATE_REGEX, 'Use MM/YYYY format (e.g. 06/2024)')
    .optional()
    .or(z.literal(''));

const optionalUrl = z
    .string()
    .url('Please enter a valid URL (https://...)')
    .optional()
    .or(z.literal(''));

// ─── Step 0: Personal Info ────────────────────────────────────────────────────

export const personalInfoSchema = z.object({
    fullName:  z.string().min(1, 'Full name is required').max(100),
    email:     z.string().email('Please enter a valid email address'),
    phone:     z.string().max(30).optional().or(z.literal('')),
    location:  z.string().max(100).optional().or(z.literal('')),
    website:   optionalUrl,
    linkedin:  optionalUrl,
    github:    optionalUrl,
    portfolio: optionalUrl,
});

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

// ─── Step 1: Professional Summary ────────────────────────────────────────────

export const summarySchema = z.object({
    summary: z
        .string()
        .max(2000, 'Summary cannot exceed 2000 characters')
        .optional()
        .or(z.literal('')),
});

export type SummaryFormData = z.infer<typeof summarySchema>;

// ─── Step 2: Work Experience ──────────────────────────────────────────────────

export const workExperienceItemSchema = z
    .object({
        clientId:    z.string(),
        jobTitle:    z.string().min(1, 'Job title is required').max(150),
        company:     z.string().min(1, 'Company name is required').max(150),
        location:    z.string().max(150).optional().or(z.literal('')),
        startDate:   z
            .string()
            .regex(DATE_REGEX, 'Use MM/YYYY format')
            .min(1, 'Start date is required'),
        endDate:     z.string().regex(DATE_REGEX, 'Use MM/YYYY format').optional().or(z.literal('')),
        isCurrent:   z.boolean().default(false),
        description: z.string().max(3000).optional().or(z.literal('')),
    })
    .refine(
        (data) => {
            // If isCurrent is false, endDate is required
            if (!data.isCurrent && !data.endDate) return false;
            return true;
        },
        {
            message: 'End date is required unless this is your current position',
            path:    ['endDate'],
        }
    );

export const experiencesSchema = z.object({
    experiences: z.array(workExperienceItemSchema),
});

export type ExperiencesFormData = z.infer<typeof experiencesSchema>;
export type WorkExperienceItemData = z.infer<typeof workExperienceItemSchema>;

// ─── Step 3: Education ────────────────────────────────────────────────────────

export const educationItemSchema = z.object({
    clientId:     z.string(),
    institution:  z.string().min(1, 'Institution name is required').max(200),
    degree:       z.string().min(1, 'Degree is required').max(100),
    fieldOfStudy: z.string().min(1, 'Field of study is required').max(150),
    startDate:    z
        .string()
        .regex(DATE_REGEX, 'Use MM/YYYY format')
        .min(1, 'Start date is required'),
    endDate:      z.string().regex(DATE_REGEX, 'Use MM/YYYY format').optional().or(z.literal('')),
    grade:        z.string().max(50).optional().or(z.literal('')),
    description:  z.string().max(1000).optional().or(z.literal('')),
});

export const educationsSchema = z.object({
    educations: z.array(educationItemSchema),
});

export type EducationsFormData = z.infer<typeof educationsSchema>;
export type EducationItemData = z.infer<typeof educationItemSchema>;

// ─── Step 4: Skills ───────────────────────────────────────────────────────────

export const skillLevels = ['beginner', 'intermediate', 'advanced', 'expert'] as const;
export type SkillLevel = (typeof skillLevels)[number];

export const skillItemSchema = z.object({
    clientId: z.string(),
    name:     z.string().min(1, 'Skill name is required').max(60),
    level:    z.enum(skillLevels, {
        errorMap: () => ({ message: 'Please select a skill level' }),
    }),
});

export const skillsSchema = z.object({
    skills: z
        .array(skillItemSchema)
        .min(1, 'Please add at least one skill')
        .max(30, 'Maximum 30 skills allowed'),
});

export type SkillsFormData = z.infer<typeof skillsSchema>;
export type SkillItemData = z.infer<typeof skillItemSchema>;

// ─── Step 5: Extras (Languages + Certifications) ──────────────────────────────

export const proficiencyLevels = ['basic', 'conversational', 'professional', 'native'] as const;
export type ProficiencyLevel = (typeof proficiencyLevels)[number];

export const languageItemSchema = z.object({
    clientId:    z.string(),
    name:        z.string().min(1, 'Language name is required').max(60),
    proficiency: z.enum(proficiencyLevels, {
        errorMap: () => ({ message: 'Please select a proficiency level' }),
    }),
});

export const certificationItemSchema = z.object({
    clientId:      z.string(),
    name:          z.string().min(1, 'Certification name is required').max(200),
    issuer:        z.string().min(1, 'Issuing organisation is required').max(200),
    issueDate:     dateString,
    expiryDate:    dateString,
    credentialId:  z.string().max(100).optional().or(z.literal('')),
    credentialUrl: optionalUrl,
});

export const extrasSchema = z.object({
    languages:      z.array(languageItemSchema),
    certifications: z.array(certificationItemSchema),
});

export type ExtrasFormData = z.infer<typeof extrasSchema>;
export type LanguageItemData = z.infer<typeof languageItemSchema>;
export type CertificationItemData = z.infer<typeof certificationItemSchema>;

// ─── Resume title + direction schema (creation modal) ────────────────────────

export const resumeMetaSchema = z.object({
    title: z
        .string()
        .min(1, 'Please give your resume a title')
        .max(100, 'Title cannot exceed 100 characters'),
    direction: z.enum(['ltr', 'rtl'], {
        errorMap: () => ({ message: 'Please select a language direction' }),
    }),
});

export type ResumeMetaFormData = z.infer<typeof resumeMetaSchema>;

// ─── Step index → schema map (used by the wizard for runtime lookup) ──────────

export const STEP_SCHEMAS = [
    personalInfoSchema,   // step 0
    summarySchema,        // step 1
    experiencesSchema,    // step 2
    educationsSchema,     // step 3
    skillsSchema,         // step 4
    extrasSchema,         // step 5
    null,                 // step 6 — Preview (read-only, no form)
] as const;
