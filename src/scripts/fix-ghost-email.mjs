/**
 * One-shot fix script for ghost email: zeinab.mohammad2014@gmail.com
 *
 * Run with:
 *   node src/scripts/fix-ghost-email.mjs
 *
 * Requires MONGODB_URI in .env.local
 */

import mongoose from 'mongoose';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// Manually load .env.local
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
        console.warn('Could not load .env.local:', e.message);
    }
}

loadEnv();

const TARGET_EMAIL = 'zeinab.mohammad2014@gmail.com';

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

    const sanitized = TARGET_EMAIL.trim().toLowerCase();
    console.log(`🔍  Searching for: "${sanitized}"\n`);

    const results = await User.find({
        $or: [
            { email: sanitized },
            { email: new RegExp(`^\\s*${sanitized.replace(/\./g, '\\.')}\\s*$`, 'i') },
        ],
    }).lean();

    if (results.length === 0) {
        console.log('⚠️   No account found for this email.');
        console.log('     The account may have been hard-deleted or never created.');
        await mongoose.disconnect();
        return;
    }

    console.log(`📋  Found ${results.length} matching record(s):\n`);

    for (const user of results) {
        console.log('─────────────────────────────────────────────────');
        console.log(`  _id        : ${user._id}`);
        console.log(`  email      : "${user.email}"`);
        console.log(`  name       : ${user.name}`);
        console.log(`  role       : ${user.role}`);
        console.log(`  isActive   : ${user.isActive}`);
        console.log(`  isVerified : ${user.isVerified}`);
        console.log(`  isApproved : ${user.isApproved}`);
        console.log(`  createdAt  : ${user.createdAt}`);
        console.log(`  updatedAt  : ${user.updatedAt}`);
        console.log('');

        const needsFix = !user.isActive || user.email !== sanitized;

        if (!needsFix) {
            console.log('✅  Account is ACTIVE and email is correctly stored. No fix needed.');
            console.log('    The user should be able to log in. If they cannot register,');
            console.log('    it is because the account already exists and is active (correct behavior).');
        } else {
            const updates = {};
            if (!user.isActive) {
                updates.isActive   = true;
                updates.isVerified = true;
                console.log('🔧  Account is INACTIVE (ghost). Reactivating…');
            }
            if (user.email !== sanitized) {
                updates.email = sanitized;
                console.log(`🔧  Email stored as "${user.email}" — normalizing to "${sanitized}"…`);
            }

            await User.updateOne({ _id: user._id }, { $set: updates });
            console.log('✅  Fix applied successfully!');
            console.log('    The user can now sign in with this email.');
        }
        console.log('─────────────────────────────────────────────────\n');
    }

    await mongoose.disconnect();
    console.log('🏁  Done. Disconnected from MongoDB.');
}

main().catch((err) => {
    console.error('💥  Script failed:', err);
    process.exit(1);
});
