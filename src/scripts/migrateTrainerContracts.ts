import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env in the project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error('❌ MONGODB_URI is not defined in the environment.');
    process.exit(1);
}

async function migrateCourses() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI!);
        console.log('✅ Connected to MongoDB.');

        const db = mongoose.connection.db;
        const coursesCollection = db.collection('courses');

        // Find courses that don't have a status or contract yet
        const courses = await coursesCollection.find({
            $or: [
                { status: { $exists: false } },
                { contract: { $exists: false } }
            ]
        }).toArray();

        console.log(`Found ${courses.length} courses to migrate.`);

        let migratedCount = 0;

        for (const course of courses) {
            // Determine status based on old isPublished flag
            const status = course.isPublished ? 'PUBLISHED' : 'DRAFT';

            // Extract old trainerCommissionRate (fallback to 0.40)
            const oldRate = course.trainerCommissionRate !== undefined ? course.trainerCommissionRate : 0.40;

            // Construct contract object (COMMISSION, lifetime)
            const contract = {
                paymentType: 'COMMISSION',
                commissionRate: oldRate,
                startDate: course.createdAt || new Date(),
                // durationMonths and endDate are intentionally omitted for lifetime contracts
            };

            await coursesCollection.updateOne(
                { _id: course._id },
                {
                    $set: {
                        status,
                        contract
                    },
                    $unset: {
                        trainerCommissionRate: ""
                    }
                }
            );

            migratedCount++;
        }

        console.log(`✅ Successfully migrated ${migratedCount} courses.`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
        process.exit(0);
    }
}

migrateCourses();
