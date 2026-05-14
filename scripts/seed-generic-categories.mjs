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

// ── Generic, broad categories ──────────
const CATEGORIES = [
    {
        name: 'Technology',
        slug: 'technology',
        icon: 'Monitor',
        description: 'Computers, software, hardware, and IT.',
    },
    {
        name: 'Finance',
        slug: 'finance',
        icon: 'Landmark',
        description: 'Money management, investing, banking, and economics.',
    },
    {
        name: 'Business',
        slug: 'business',
        icon: 'Building',
        description: 'Management, administration, and corporate operations.',
    },
    {
        name: 'Education',
        slug: 'education',
        icon: 'BookOpen',
        description: 'Teaching, academics, and instructional design.',
    },
    {
        name: 'Healthcare',
        slug: 'healthcare',
        icon: 'Stethoscope',
        description: 'Medical fields, nursing, and public health.',
    },
    {
        name: 'Arts & Design',
        slug: 'arts-and-design',
        icon: 'PenTool',
        description: 'Visual arts, graphic design, and creative media.',
    },
    {
        name: 'Marketing',
        slug: 'marketing',
        icon: 'BarChart',
        description: 'Advertising, market research, and branding.',
    },
    {
        name: 'Engineering',
        slug: 'engineering',
        icon: 'Wrench',
        description: 'Civil, mechanical, electrical, and other engineering disciplines.',
    },
    {
        name: 'Humanities & Social Sciences',
        slug: 'humanities-social-sciences',
        icon: 'Library',
        description: 'History, sociology, psychology, and literature.',
    },
    {
        name: 'Science & Mathematics',
        slug: 'science-mathematics',
        icon: 'Microscope',
        description: 'Physics, chemistry, biology, and applied mathematics.',
    },
    {
        name: 'Personal Development',
        slug: 'personal-development',
        icon: 'UserPlus',
        description: 'Self-improvement, life coaching, and personal growth.',
    },
    {
        name: 'Sales',
        slug: 'sales',
        icon: 'BadgeDollarSign',
        description: 'Retail, B2B, account management, and sales strategies.',
    },
    {
        name: 'Customer Service',
        slug: 'customer-service',
        icon: 'Headphones',
        description: 'Client support, call centers, and customer relations.',
    },
    {
        name: 'Trades & Services',
        slug: 'trades-services',
        icon: 'Hammer',
        description: 'Construction, plumbing, electrical work, and physical trades.',
    }
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

    console.log(`\n📊 Done — ${created} new generic categories seeded, ${skipped} already existed.`);
    await mongoose.disconnect();
    console.log('🔌 Disconnected.\n');
}

seedCategories().catch((err) => {
    console.error('❌ Seeder failed:', err.message);
    process.exit(1);
});
