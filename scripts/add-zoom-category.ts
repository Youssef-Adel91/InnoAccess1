// Load environment variables FIRST before any imports
import { config } from 'dotenv';
config({ path: '.env.local' });

import mongoose from 'mongoose';

/**
 * Add Zoom Meetings Category Script
 * 
 * Adds "Zoom Meetings" category for LIVE courses
 */

async function addZoomCategory() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI not found in .env.local');
        }

        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Define Category model inline to avoid import issues
        const CategorySchema = new mongoose.Schema({
            name: { type: String, required: true, unique: true },
            slug: { type: String, required: true, unique: true },
            description: String,
            isActive: { type: Boolean, default: true },
        }, { timestamps: true });

        const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);

        // Check if Zoom Meetings category already exists
        const existingCategory = await Category.findOne({ slug: 'zoom-meetings' });

        if (existingCategory) {
            console.log('⚠️  Zoom Meetings category already exists');
            console.log('✅ Category ID:', existingCategory._id);
            console.log('📝 Name:', existingCategory.name);
            await mongoose.disconnect();
            process.exit(0);
            return;
        }

        // Create Zoom Meetings category
        console.log('📁 Creating Zoom Meetings category...');
        const category = await Category.create({
            name: 'Zoom Meetings',
            slug: 'zoom-meetings',
            description: 'Live interactive workshops and sessions via Zoom',
            isActive: true,
        });

        console.log('\n✅ Zoom Meetings category created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 Name:', category.name);
        console.log('🔗 Slug:', category.slug);
        console.log('🆔 ID:', category._id);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🎉 Category ready to use for LIVE courses!\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding category:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

addZoomCategory();
