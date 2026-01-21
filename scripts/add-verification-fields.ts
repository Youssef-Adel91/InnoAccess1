/**
 * Migration Script: Add Email Verification Fields to Existing Users
 * 
 * This script updates all existing users in the database to mark them as verified.
 * This prevents locking out existing users when the email verification feature is deployed.
 * 
 * Run this ONCE before deploying the email verification feature to production.
 * 
 * Usage: npm run migrate:verification
 */

import dotenv from 'dotenv';
import { connectDB } from '../src/lib/db';
import User from '../src/models/User';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function migrateUsers() {
    try {
        console.log('🔄 Starting migration: Adding email verification fields to existing users...\n');

        // Connect to database
        await connectDB();
        console.log('✅ Connected to database\n');

        // Find all users who don't have the isVerified field or it's undefined
        const usersToUpdate = await User.find({
            $or: [
                { isVerified: { $exists: false } },
                { isVerified: null },
            ],
        });

        console.log(`📊 Found ${usersToUpdate.length} users to migrate\n`);

        if (usersToUpdate.length === 0) {
            console.log('✅ No users need migration. All users already have verification fields.');
            process.exit(0);
        }

        // Update all existing users to be verified
        const result = await User.updateMany(
            {
                $or: [
                    { isVerified: { $exists: false } },
                    { isVerified: null },
                ],
            },
            {
                $set: {
                    isVerified: true, // Mark existing users as verified
                },
            }
        );

        console.log(`✅ Migration completed successfully!`);
        console.log(`   - Modified ${result.modifiedCount} users`);
        console.log(`   - Matched ${result.matchedCount} users`);
        console.log('\n📝 All existing users are now marked as verified.');
        console.log('   New users will need to verify their email before signing in.\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateUsers();
