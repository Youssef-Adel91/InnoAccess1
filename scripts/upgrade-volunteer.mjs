import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// ── Target user ───────────────────────────────────────────────────────────────
const TARGET_EMAIL    = 'maroa7535@gmail.com';
const TEMP_PASSWORD   = 'InnoAccess2027!';
// ─────────────────────────────────────────────────────────────────────────────

// Minimal inline schema — only fields we touch
const UserSchema = new mongoose.Schema(
    {
        name:       { type: String },
        email:      { type: String, required: true, unique: true },
        password:   { type: String },
        role:       { type: String, enum: ['user', 'company', 'trainer', 'admin', 'volunteer'], default: 'user' },
        isVerified: { type: Boolean, default: false },
        isApproved: { type: Boolean, default: false },
        isActive:   { type: Boolean, default: true },
    },
    { timestamps: true, strict: false }   // strict:false preserves any extra fields already on the doc
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function upgradeVolunteer() {
    console.log('\n🔌 Connecting to MongoDB…');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15_000 });
    console.log('✅ Connected\n');

    const user = await User.findOne({ email: TARGET_EMAIL });

    if (!user) {
        console.error(`❌ No user found with email: ${TARGET_EMAIL}`);
        process.exit(1);
    }

    console.log('👤 User found:');
    console.log(`   Name  : ${user.name}`);
    console.log(`   Email : ${user.email}`);
    console.log(`   Role  : ${user.role}  →  volunteer`);
    console.log(`   ID    : ${user._id}\n`);

    // 1️⃣  Upgrade role
    user.role = 'volunteer';

    // 2️⃣  Hash & set temporary password
    const hashed = await bcrypt.hash(TEMP_PASSWORD, 12);
    user.password = hashed;

    // Ensure account is active + verified so login works immediately
    user.isVerified = true;
    user.isActive   = true;

    await user.save();

    console.log('✅ User successfully updated:');
    console.log(`   Role     : ${user.role}`);
    console.log(`   Password : [bcrypt hash set — temp password is "InnoAccess2027!"]`);
    console.log(`   Verified : ${user.isVerified}`);
    console.log(`   Active   : ${user.isActive}`);

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected. Done!\n');
}

upgradeVolunteer().catch((err) => {
    console.error('❌ Script failed:', err.message);
    process.exit(1);
});
