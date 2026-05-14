import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const CategorySchema = new mongoose.Schema(
    {
        name:        { type: String, required: true, unique: true, trim: true },
        slug:        { type: String, required: true, unique: true, lowercase: true, trim: true },
        icon:        { type: String, trim: true },
        description: { type: String, maxlength: 500 },
    },
    { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

// ── Categories tailored for an accessible job-board / LMS platform ──────────
const CATEGORIES = [
    {
        name: 'Technology & Coding',
        slug: 'technology-coding',
        icon: 'Code',
        description: 'Programming, software development, and computer science fundamentals.',
    },
    {
        name: 'Web Development',
        slug: 'web-development',
        icon: 'Globe',
        description: 'Frontend, backend, and full-stack web development.',
    },
    {
        name: 'Data Science & AI',
        slug: 'data-science-ai',
        icon: 'BrainCircuit',
        description: 'Machine learning, artificial intelligence, and data analysis.',
    },
    {
        name: 'Cybersecurity',
        slug: 'cybersecurity',
        icon: 'ShieldCheck',
        description: 'Network security, ethical hacking, and digital safety.',
    },
    {
        name: 'Design & UX',
        slug: 'design-ux',
        icon: 'Palette',
        description: 'UI/UX design, graphic design, and accessibility-first interfaces.',
    },
    {
        name: 'Business & Entrepreneurship',
        slug: 'business-entrepreneurship',
        icon: 'Briefcase',
        description: 'Business strategy, startups, and entrepreneurship.',
    },
    {
        name: 'Digital Marketing',
        slug: 'digital-marketing',
        icon: 'Megaphone',
        description: 'SEO, social media, content marketing, and online advertising.',
    },
    {
        name: 'Career Development',
        slug: 'career-development',
        icon: 'TrendingUp',
        description: 'CV writing, interview skills, and professional growth.',
    },
    {
        name: 'Assistive Technology',
        slug: 'assistive-technology',
        icon: 'Accessibility',
        description: 'Screen readers, braille displays, and tools for people with disabilities.',
    },
    {
        name: 'Accessibility & Inclusion',
        slug: 'accessibility-inclusion',
        icon: 'Users',
        description: 'WCAG, inclusive design, and building accessible products.',
    },
    {
        name: 'Language Learning',
        slug: 'language-learning',
        icon: 'Languages',
        description: 'Arabic, English, and other languages for personal and professional growth.',
    },
    {
        name: 'Finance & Accounting',
        slug: 'finance-accounting',
        icon: 'DollarSign',
        description: 'Personal finance, bookkeeping, and financial analysis.',
    },
    {
        name: 'Health & Wellness',
        slug: 'health-wellness',
        icon: 'Heart',
        description: 'Mental health, physical wellbeing, and adaptive fitness.',
    },
    {
        name: 'Soft Skills',
        slug: 'soft-skills',
        icon: 'MessageCircle',
        description: 'Communication, teamwork, leadership, and time management.',
    },
    {
        name: 'Photography & Media',
        slug: 'photography-media',
        icon: 'Camera',
        description: 'Photography, video production, and audio description techniques.',
    },
    {
        name: 'Music & Audio',
        slug: 'music-audio',
        icon: 'Music',
        description: 'Music theory, audio production, and sound design.',
    },
    {
        name: 'Cloud Computing',
        slug: 'cloud-computing',
        icon: 'Cloud',
        description: 'AWS, Azure, Google Cloud, and serverless architecture.',
    },
    {
        name: 'Mobile Development',
        slug: 'mobile-development',
        icon: 'Smartphone',
        description: 'iOS, Android, and cross-platform mobile app development.',
    },
    {
        name: 'Project Management',
        slug: 'project-management',
        icon: 'ClipboardList',
        description: 'Agile, Scrum, PMP, and effective team coordination.',
    },
    {
        name: 'Legal & Rights',
        slug: 'legal-rights',
        icon: 'Scale',
        description: 'Disability rights, labor law, and legal awareness for professionals.',
    },
];

async function seedCategories() {
    console.log('\n🔌 Connecting to MongoDB…');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ Connected\n');

    let created = 0;
    let skipped = 0;

    for (const cat of CATEGORIES) {
        try {
            await Category.findOneAndUpdate(
                { slug: cat.slug },
                { $setOnInsert: cat },
                { upsert: true, new: true }
            );
            console.log(`  ✅ ${cat.name}`);
            created++;
        } catch (err) {
            if (err.code === 11000) {
                console.log(`  ⏭️  ${cat.name} (already exists)`);
                skipped++;
            } else {
                console.error(`  ❌ ${cat.name}: ${err.message}`);
            }
        }
    }

    console.log(`\n📊 Done — ${created} seeded, ${skipped} already existed.`);
    await mongoose.disconnect();
    console.log('🔌 Disconnected.\n');
}

seedCategories().catch((err) => {
    console.error('❌ Seeder failed:', err.message);
    process.exit(1);
});
