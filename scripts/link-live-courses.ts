// Load environment variables FIRST before any imports
import { config } from 'dotenv';
config({ path: '.env.local' });

import mongoose from 'mongoose';

/**
 * Link existing LIVE courses to Zoom Meetings category
 * 
 * This script updates all LIVE courses to use the Zoom Meetings category
 */

async function linkLiveCoursesToZoomCategory() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI;

        if (!MONGODB_URI) {
            throw new Error('MONGODB_URI not found in .env.local');
        }

        console.log('🔌 Connecting to database...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Define models inline
        const CategorySchema = new mongoose.Schema({
            name: { type: String, required: true, unique: true },
            slug: { type: String, required: true, unique: true },
        });

        const CourseSchema = new mongoose.Schema({
            title: String,
            courseType: { type: String, enum: ['RECORDED', 'LIVE'] },
            categoryId: mongoose.Schema.Types.ObjectId,
        });

        const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
        const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);

        // Find Zoom Meetings category
        console.log('🔍 Finding Zoom Meetings category...');
        const zoomCategory = await Category.findOne({ slug: 'zoom-meetings' });

        if (!zoomCategory) {
            console.error('❌ Zoom Meetings category not found. Please run add-zoom-category.ts first!');
            await mongoose.disconnect();
            process.exit(1);
            return;
        }

        console.log('✅ Found Zoom Meetings category:', zoomCategory._id);

        // Find all LIVE courses
        console.log('🔍 Finding LIVE courses...');
        const liveCourses = await Course.find({ courseType: 'LIVE' });

        if (liveCourses.length === 0) {
            console.log('⚠️  No LIVE courses found');
            await mongoose.disconnect();
            process.exit(0);
            return;
        }

        console.log(`📚 Found ${liveCourses.length} LIVE course(s)`);

        // Update each LIVE course
        let updated = 0;
        for (const course of liveCourses) {
            // Check if already linked
            if (course.categoryId.toString() === zoomCategory._id.toString()) {
                console.log(`⏭️  "${course.title}" already linked to Zoom Meetings`);
                continue;
            }

            // Update category
            course.categoryId = zoomCategory._id;
            await course.save();
            updated++;
            console.log(`✅ Updated "${course.title}" → Zoom Meetings category`);
        }

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🎉 Successfully updated ${updated} LIVE course(s)`);
        console.log(`📁 All LIVE courses now appear in "Zoom Meetings" category`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error linking courses:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

linkLiveCoursesToZoomCategory();
