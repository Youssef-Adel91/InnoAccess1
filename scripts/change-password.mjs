/**
 * Script to change user password in MongoDB
 *
 * Run with:
 *   node scripts/change-password.mjs
 *
 * Requires MONGODB_URI in .env.local
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// ── Target user ───────────────────────────────────────────────────────────────
const TARGET_EMAIL   = 'youssefsobhyy@gmail.com';
const NEW_PASSWORD   = 'YoSo_@#1';
// ─────────────────────────────────────────────────────────────────────────────

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models['User'] ?? mongoose.model('User', UserSchema, 'users');

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌  MONGODB_URI is not set in .env.local');
        process.exit(1);
    }

    console.log('\n🔌  Connecting to MongoDB…');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('✅  Connected\n');

    const email = TARGET_EMAIL.trim().toLowerCase();
    console.log(`🔍  Looking for user: "${email}"\n`);

    const user = await User.findOne({ email });

    if (!user) {
        console.error(`❌  No user found with email: "${email}"`);
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log('📋  User found:');
    console.log(`    _id   : ${user._id}`);
    console.log(`    email : ${user.email}`);
    console.log(`    name  : ${user.name}`);
    console.log(`    role  : ${user.role}\n`);

    // Hash the new password with bcrypt (12 rounds, same as the rest of the app)
    const hashed = await bcrypt.hash(NEW_PASSWORD, 12);

    await User.updateOne({ _id: user._id }, { $set: { password: hashed } });

    console.log('✅  Password updated successfully!');
    console.log(`    Email    : ${email}`);
    console.log(`    New pass : ${NEW_PASSWORD}\n`);

    await mongoose.disconnect();
    console.log('🏁  Done. Disconnected from MongoDB.');
}

main().catch((err) => {
    console.error('💥  Script failed:', err.message);
    process.exit(1);
});
