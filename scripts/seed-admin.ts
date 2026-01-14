import { connectDB } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import { hashPassword } from '@/lib/auth-utils';

/**
 * Seed Admin User Script
 * 
 * This script creates the first admin user in the database.
 * Run this once to create your admin account.
 * 
 * Usage:
 * node --loader ts-node/esm scripts/seed-admin.ts
 * OR add to package.json scripts and run: npm run seed:admin
 */

async function seedAdmin() {
    try {
        console.log('🔌 Connecting to database...');
        await connectDB();

        const adminEmail = 'youssefffadel555@gmail.com'; // Fixed typo: gmain -> gmail
        const adminPassword = 'YAIa.#@1';

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (existingAdmin) {
            console.log('⚠️  Admin user already exists:', adminEmail);
            console.log('✅ Admin ID:', existingAdmin._id);
            return;
        }

        // Hash password
        const hashedPassword = await hashPassword(adminPassword);

        // Create admin user
        const admin = await User.create({
            name: 'Yousef Adel',
            email: adminEmail,
            password: hashedPassword,
            role: UserRole.ADMIN,
            isApproved: true,
            isActive: true,
        });

        console.log('✅ Admin user created successfully!');
        console.log('📧 Email:', admin.email);
        console.log('👤 Name:', admin.name);
        console.log('🔑 Role:', admin.role);
        console.log('🆔 ID:', admin._id);
        console.log('\n🎉 You can now sign in with these credentials!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        process.exit(1);
    }
}

seedAdmin();
