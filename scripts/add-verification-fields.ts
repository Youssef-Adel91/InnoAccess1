/**
 * Migration Script: Add Email Verification Fields to Existing Users
 * STANDALONE VERSION - No dependencies on src/ files
 */

// Load environment variables FIRST
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Get MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env.local');
    console.error('   Please make sure .env.local exists and contains MONGODB_URI');
    process.exit(1);
}

// Define User schema (simplified for migration)
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    isVerified: { type: Boolean, default: false },
    verificationToken: String,
    verificationTokenExpiry: Date,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function migrateUsers() {
    try {
        console.log('🔄 Starting migration: Adding email verification fields to existing users...\n');

        // Connect to MongoDB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to database\n');

        // Find all users who don't have isVerified field
        const usersToUpdate = await User.countDocuments({
            $or: [
                { isVerified: { $exists: false } },
                { isVerified: null },
            ],
        });

        console.log(`📊 Found ${usersToUpdate} users to migrate\n`);

        if (usersToUpdate === 0) {
            console.log('✅ No users need migration. All users already have verification fields.');
            await mongoose.connection.close();
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

        await mongoose.connection.close();
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run migration
migrateUsers();
