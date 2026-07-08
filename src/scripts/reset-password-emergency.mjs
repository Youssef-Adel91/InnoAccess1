/**
 * Emergency password reset script
 * Target: zeinab.mohammad2014@gmail.com
 * New password: InnoAccess2026!
 *
 * Uses bcryptjs (salt rounds: 10) — identical to the app's auth-utils.ts
 *
 * Run with: node src/scripts/reset-password-emergency.mjs
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Load .env.local
function loadEnv() {
    try {
        const envPath = resolve(__dirname, '../../.env.local');
        const content = readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eq = trimmed.indexOf('=');
            if (eq === -1) continue;
            const key = trimmed.slice(0, eq).trim();
            const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) process.env[key] = val;
        }
    } catch (e) {
        console.warn('⚠️  Could not load .env.local:', e.message);
    }
}

loadEnv();

const TARGET_EMAIL   = 'zeinab.mohammad2014@gmail.com';
const NEW_PASSWORD   = 'InnoAccess2026!';
const SALT_ROUNDS    = 10; // Must match auth-utils.ts

const UserSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.models['User'] ?? mongoose.model('User', UserSchema, 'users');

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌  MONGODB_URI is not set in .env.local');
        process.exit(1);
    }

    console.log('🔗  Connecting to MongoDB…');
    await mongoose.connect(uri);
    console.log('✅  Connected.\n');

    const email = TARGET_EMAIL.trim().toLowerCase();
    console.log(`🔍  Looking up: ${email}`);

    const user = await User.findOne({ email });

    if (!user) {
        console.error(`❌  No account found for "${email}". Aborting.`);
        await mongoose.disconnect();
        process.exit(1);
    }

    console.log(`\n📋  Account found:`);
    console.log(`    _id      : ${user._id}`);
    console.log(`    name     : ${user.name}`);
    console.log(`    role     : ${user.role}`);
    console.log(`    isActive : ${user.isActive}`);

    // Hash the new password with bcryptjs (same as the app)
    console.log(`\n🔐  Hashing new password with bcryptjs (${SALT_ROUNDS} rounds)…`);
    const salt       = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPwd  = await bcrypt.hash(NEW_PASSWORD, salt);

    // Sanity check — verify hash works before saving
    const verified = await bcrypt.compare(NEW_PASSWORD, hashedPwd);
    if (!verified) {
        console.error('❌  Hash verification failed. Aborting — nothing was saved.');
        await mongoose.disconnect();
        process.exit(1);
    }
    console.log('✅  Hash verified successfully.\n');

    // Save to DB
    await User.updateOne(
        { _id: user._id },
        {
            $set: {
                password: hashedPwd,
                isActive: true,    // ensure account is active
                isVerified: true,  // ensure account is verified
                // Clear any stale reset tokens so they can't interfere
                resetPasswordToken:   null,
                resetPasswordExpires: null,
            },
        }
    );

    console.log('─────────────────────────────────────────────────');
    console.log('✅  PASSWORD RESET COMPLETE');
    console.log(`    Email    : ${email}`);
    console.log(`    Password : ${NEW_PASSWORD}`);
    console.log('─────────────────────────────────────────────────');
    console.log('\n⚠️  Remind the user to change this password after first login.');

    await mongoose.disconnect();
    console.log('\n🏁  Done. Disconnected from MongoDB.');
}

main().catch((err) => {
    console.error('💥  Script failed:', err);
    process.exit(1);
});
