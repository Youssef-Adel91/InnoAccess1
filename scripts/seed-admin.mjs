import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// ── Admin credentials ─────────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'youssefffadel555@gmail.com';
const ADMIN_PASSWORD = 'YAIa.#@1';
const ADMIN_NAME     = 'Youssef Adel';
// ─────────────────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({
    name:           { type: String, required: true },
    email:          { type: String, required: true, unique: true },
    password:       { type: String, required: true },
    role:           { type: String, enum: ['user', 'company', 'trainer', 'admin'], default: 'user' },
    isVerified:     { type: Boolean, default: false },
    isApproved:     { type: Boolean, default: false },
    createdAt:      { type: Date,    default: Date.now },
    updatedAt:      { type: Date,    default: Date.now },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seedAdmin() {
    console.log('\n🔌 Connecting to MongoDB…');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ Connected\n');

    const existing = await User.findOne({ email: ADMIN_EMAIL });

    if (existing) {
        // Upgrade existing account to admin
        existing.role       = 'admin';
        existing.isVerified = true;
        existing.isApproved = true;
        existing.updatedAt  = new Date();
        await existing.save();
        console.log('✅ Existing account upgraded to admin:');
        console.log(`   Email : ${existing.email}`);
        console.log(`   Role  : ${existing.role}`);
        console.log(`   ID    : ${existing._id}`);
    } else {
        // Create brand-new admin account
        const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
        const admin  = await User.create({
            name:       ADMIN_NAME,
            email:      ADMIN_EMAIL,
            password:   hashed,
            role:       'admin',
            isVerified: true,   // skip OTP — admin is pre-verified
            isApproved: true,
        });
        console.log('✅ Admin user created:');
        console.log(`   Name  : ${admin.name}`);
        console.log(`   Email : ${admin.email}`);
        console.log(`   Role  : ${admin.role}`);
        console.log(`   ID    : ${admin._id}`);
    }

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected. Done!\n');
}

seedAdmin().catch((err) => {
    console.error('❌ Seeder failed:', err.message);
    process.exit(1);
});
