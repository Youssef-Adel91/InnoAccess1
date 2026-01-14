// Check what data is in the database for the company
import { config } from 'dotenv';
config({ path: '.env.local' });

import mongoose from 'mongoose';

async function checkCompanyData() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI not found');
        }

        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected\n');

        const UserSchema = new mongoose.Schema({
            name: String,
            email: String,
            role: String,
            profile: Object,
            createdAt: Date,
        });

        const User = mongoose.models.User || mongoose.model('User', UserSchema);

        const company = await User.findOne({ email: 'innoaccess2@gmail.com' });

        if (company) {
            console.log('📋 Company Data:');
            console.log('Name:', company.name);
            console.log('Email:', company.email);
            console.log('Role:', company.role);
            console.log('\n📦 Profile Object:');
            console.log(JSON.stringify(company.profile, null, 2));
        } else {
            console.log('❌ Company not found');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

checkCompanyData();
