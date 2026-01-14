// Load environment variables FIRST before any imports
import { config } from 'dotenv';
config({ path: '.env.local' });

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Seed Admin User Script
 * 
 * Simple script to create the first admin user.
 * This bypasses the complex env validation.
 */

async function seedAdmin() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI not found in .env.local');
        }

        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const adminEmail = 'youssefffadel555@gmail.com';
        const adminPassword = 'YAIa.#@1';

        // Define User model inline to avoid import issues
        const UserSchema = new mongoose.Schema({
            name: String,
            email: { type: String, unique: true, lowercase: true },
            password: String,
            role: { type: String, enum: ['user', 'company', 'trainer', 'admin'] },
            isApproved: { type: Boolean, default: true },
            isActive: { type: Boolean, default: true },
        }, { timestamps: true });

        const User = mongoose.models.User || mongoose.model('User', UserSchema);

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists:', adminEmail);
            console.log('✅ Admin ID:', existingAdmin._id);
            console.log('🔑 Role:', existingAdmin.role);
            await mongoose.disconnect();
            process.exit(0);
            return;
        }

        // Hash password
        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        // Create admin user
        console.log('👤 Creating admin user...');
        const admin = await User.create({
            name: 'Yousef Adel',
            email: adminEmail,
            password: hashedPassword,
            role: 'admin',
            isApproved: true,
            isActive: true,
        });

        console.log('\n✅ Admin user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📧 Email:', admin.email);
        console.log('👤 Name:', admin.name);
        console.log('🔑 Role:', admin.role);
        console.log('🆔 ID:', admin._id);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🎉 You can now sign in at http://localhost:3000/auth/signin');
        console.log('   Email:', adminEmail);
        console.log('   Password: YAIa.#@1\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

seedAdmin();
