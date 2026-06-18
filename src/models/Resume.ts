import mongoose, { Schema, Model, Document, Types } from 'mongoose';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Hard limit enforced at the API layer. Stored here as a single source of truth. */
export const MAX_RESUMES_PER_USER = 3;

// ─── Sub-document Interfaces ──────────────────────────────────────────────────

/**
 * Personal contact information — pre-filled from the user's profile
 * where available, but fully editable inside the wizard.
 */
export interface IPersonalInfo {
    fullName:   string;
    email:      string;
    phone?:     string;
    location?:  string; // e.g. "Cairo, Egypt"
    website?:   string;
    linkedin?:  string;
    github?:    string;
    portfolio?: string;
}

/**
 * A single work experience entry.
 * Dates are stored as "MM/YYYY" strings — not Date objects — because
 * resumes typically use partial dates (month + year only).
 */
export interface IWorkExperience {
    _id:         Types.ObjectId;
    jobTitle:    string;
    company:     string;
    location?:   string;
    startDate:   string; // "MM/YYYY"
    endDate?:    string; // "MM/YYYY" | null = "Present"
    isCurrent:   boolean;
    description: string; // Free-form text; bullet points as newline-separated lines
}

/**
 * A single education entry.
 */
export interface IEducation {
    _id:           Types.ObjectId;
    institution:   string;
    degree:        string;       // "Bachelor of Science"
    fieldOfStudy:  string;       // "Computer Science"
    startDate:     string;       // "MM/YYYY"
    endDate?:      string;       // "MM/YYYY" | null = "Present"
    grade?:        string;       // "3.8 GPA" | "Distinction" etc.
    description?:  string;
}

/**
 * A skill with a self-assessed proficiency level.
 */
export interface ISkill {
    _id:   Types.ObjectId;
    name:  string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

/**
 * A language with a standardised proficiency level.
 */
export interface ILanguage {
    _id:         Types.ObjectId;
    name:        string;
    proficiency: 'basic' | 'conversational' | 'professional' | 'native';
}

/**
 * A professional certification or credential.
 */
export interface ICertification {
    _id:             Types.ObjectId;
    name:            string;
    issuer:          string;
    issueDate?:      string; // "MM/YYYY"
    expiryDate?:     string; // "MM/YYYY"
    credentialId?:   string;
    credentialUrl?:  string;
}

// ─── Main Resume Interface ────────────────────────────────────────────────────

/**
 * The top-level Resume document.
 *
 * ─── Design decisions ────────────────────────────────────────────────────────
 *
 * Multiple resumes per user (max MAX_RESUMES_PER_USER = 3):
 *   Users often need different versions of their CV for different job types.
 *   The 3-resume limit balances flexibility with storage cost.
 *
 * `direction` field:
 *   Indicates whether this resume was composed in Arabic (RTL) or English (LTR).
 *   The @react-pdf/renderer ClassicTemplate uses this to flip layout, text
 *   alignment, and load the correct font (Amiri for Arabic, Inter for Latin).
 *
 * `isDefault` flag:
 *   The resume pre-selected when applying to a job. Only ONE resume per user
 *   may have isDefault = true. Enforced at the API layer using a findOneAndUpdate.
 *
 * `pdfUrl`:
 *   The Vercel Blob URL of the last generated PDF. Stale after any edit —
 *   the UI shows a "Regenerate PDF" prompt when `updatedAt > lastExportedAt`.
 */
export interface IResume extends Document {
    userId:           Types.ObjectId;
    title:            string;
    direction:        'ltr' | 'rtl'; // LTR = English resume, RTL = Arabic resume
    isDefault:        boolean;
    personalInfo:     IPersonalInfo;
    summary:          string;
    experiences:      IWorkExperience[];
    educations:       IEducation[];
    skills:           ISkill[];
    languages:        ILanguage[];
    certifications:   ICertification[];
    templateId:       'classic';     // Only 'classic' in Sprint 1
    pdfUrl?:          string;        // Vercel Blob URL of last export
    lastExportedAt?:  Date;
    createdAt:        Date;
    updatedAt:        Date;
}

// ─── Sub-document Schemas ─────────────────────────────────────────────────────

const PersonalInfoSchema = new Schema<IPersonalInfo>(
    {
        fullName:   { type: String, required: [true, 'Full name is required'], trim: true, maxlength: 100 },
        email:      { type: String, required: [true, 'Email is required'],     trim: true, lowercase: true },
        phone:      { type: String, trim: true, maxlength: 30  },
        location:   { type: String, trim: true, maxlength: 100 },
        website:    { type: String, trim: true, maxlength: 255 },
        linkedin:   { type: String, trim: true, maxlength: 255 },
        github:     { type: String, trim: true, maxlength: 255 },
        portfolio:  { type: String, trim: true, maxlength: 255 },
    },
    { _id: false } // Embedded — no separate _id needed
);

const WorkExperienceSchema = new Schema<IWorkExperience>(
    {
        jobTitle:    { type: String, required: true, trim: true, maxlength: 150 },
        company:     { type: String, required: true, trim: true, maxlength: 150 },
        location:    { type: String, trim: true, maxlength: 150 },
        startDate:   { type: String, required: true, match: [/^\d{2}\/\d{4}$/, 'Use MM/YYYY format'] },
        endDate:     { type: String, match: [/^\d{2}\/\d{4}$/, 'Use MM/YYYY format'] },
        isCurrent:   { type: Boolean, default: false },
        description: { type: String, maxlength: 3000 },
    }
    // _id: true (default) — needed for stable React array keys and a11y announcements
);

const EducationSchema = new Schema<IEducation>(
    {
        institution:  { type: String, required: true, trim: true, maxlength: 200 },
        degree:       { type: String, required: true, trim: true, maxlength: 100 },
        fieldOfStudy: { type: String, required: true, trim: true, maxlength: 150 },
        startDate:    { type: String, required: true, match: [/^\d{2}\/\d{4}$/, 'Use MM/YYYY format'] },
        endDate:      { type: String, match: [/^\d{2}\/\d{4}$/, 'Use MM/YYYY format'] },
        grade:        { type: String, trim: true, maxlength: 50 },
        description:  { type: String, maxlength: 1000 },
    }
);

const SkillSchema = new Schema<ISkill>(
    {
        name:  { type: String, required: true, trim: true, maxlength: 60 },
        level: {
            type:     String,
            required: true,
            enum:     ['beginner', 'intermediate', 'advanced', 'expert'],
            default:  'intermediate',
        },
    }
);

const LanguageSchema = new Schema<ILanguage>(
    {
        name:        { type: String, required: true, trim: true, maxlength: 60 },
        proficiency: {
            type:     String,
            required: true,
            enum:     ['basic', 'conversational', 'professional', 'native'],
        },
    }
);

const CertificationSchema = new Schema<ICertification>(
    {
        name:           { type: String, required: true, trim: true, maxlength: 200 },
        issuer:         { type: String, required: true, trim: true, maxlength: 200 },
        issueDate:      { type: String, match: [/^\d{2}\/\d{4}$/, 'Use MM/YYYY format'] },
        expiryDate:     { type: String, match: [/^\d{2}\/\d{4}$/, 'Use MM/YYYY format'] },
        credentialId:   { type: String, trim: true, maxlength: 100 },
        credentialUrl:  { type: String, trim: true, maxlength: 255 },
    }
);

// ─── Root Resume Schema ───────────────────────────────────────────────────────

const ResumeSchema = new Schema<IResume>(
    {
        userId: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'User ID is required'],
            index:    true,
        },

        title: {
            type:      String,
            required:  [true, 'Resume title is required'],
            trim:      true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
            default:   'My Resume',
        },

        /**
         * Tracks which language this resume is written in.
         * 'rtl' = Arabic-language resume → PDF uses Amiri font + RTL layout.
         * 'ltr' = English-language resume → PDF uses Inter/Helvetica + LTR.
         * This is a user-selected property set at resume creation time.
         */
        direction: {
            type:    String,
            enum:    ['ltr', 'rtl'],
            default: 'ltr',
        },

        /**
         * Only one resume per user can be the default.
         * Enforced in the API with a two-step transaction:
         *   1. Unset isDefault on all other resumes for this user
         *   2. Set isDefault = true on the target resume
         * NOT enforced as a MongoDB unique index because MongoDB cannot express
         * a partial uniqueness constraint like "unique where isDefault = true".
         */
        isDefault: {
            type:    Boolean,
            default: false,
        },

        personalInfo: {
            type:     PersonalInfoSchema,
            required: true,
            default:  {},
        },

        summary: {
            type:      String,
            maxlength: [2000, 'Summary cannot exceed 2000 characters'],
            default:   '',
        },

        experiences:    { type: [WorkExperienceSchema],  default: [] },
        educations:     { type: [EducationSchema],        default: [] },
        skills:         { type: [SkillSchema],            default: [] },
        languages:      { type: [LanguageSchema],         default: [] },
        certifications: { type: [CertificationSchema],    default: [] },

        templateId: {
            type:    String,
            enum:    ['classic'],
            default: 'classic',
        },

        pdfUrl: {
            type: String,
        },

        lastExportedAt: {
            type: Date,
        },
    },
    {
        timestamps: true, // createdAt + updatedAt
    }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// All resumes for a user — used by GET /api/resumes
ResumeSchema.index({ userId: 1, updatedAt: -1 });

// Quick lookup of user's default resume
ResumeSchema.index({ userId: 1, isDefault: 1 });

// ─── Virtual: isPdfStale ──────────────────────────────────────────────────────

/**
 * Returns true if the resume has been edited since the last PDF export.
 * The UI uses this to show a "Regenerate PDF" prompt on the preview step.
 */
ResumeSchema.virtual('isPdfStale').get(function (this: IResume) {
    if (!this.pdfUrl || !this.lastExportedAt) return true;
    return this.updatedAt > this.lastExportedAt;
});

// ─── Model ────────────────────────────────────────────────────────────────────

const Resume: Model<IResume> =
    mongoose.models.Resume || mongoose.model<IResume>('Resume', ResumeSchema);

export default Resume;
