import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import { sendEmail, getWorkshopReminderEmailTemplate } from '@/lib/mail';

/**
 * Workshop Reminder Cron Job
 * 
 * Runs every minute to send reminder emails to students
 * whose workshops are starting in 10-15 minutes
 * 
 * Vercel Cron: * * * * * (every minute)
 * Authorization: Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
    try {
        // 1. Verify authorization (cron secret)
        const authHeader = request.headers.get('authorization');
        const expectedAuth = `Bearer ${process.env.CRON_SECRET || 'dev-secret'}`;

        if (authHeader !== expectedAuth) {
            console.warn('🚫 Unauthorized cron attempt');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('⏰ Workshop reminder cron started...');

        await connectDB();

        // 2. Find workshops starting in 10-15 minutes
        const now = new Date();
        const tenMinsFromNow = new Date(now.getTime() + 10 * 60 * 1000);
        const fifteenMinsFromNow = new Date(now.getTime() + 15 * 60 * 1000);

        const upcomingWorkshops = await Course.find({
            courseType: 'LIVE',
            isPublished: true,
            'liveSession.startDate': {
                $gte: tenMinsFromNow,
                $lte: fifteenMinsFromNow,
            },
            // Only send if not already sent
            $or: [
                { lastReminderSent: { $exists: false } },
                { lastReminderSent: null },
            ],
        }).populate('categoryId', 'name');

        if (upcomingWorkshops.length === 0) {
            console.log('✅ No upcoming workshops in next 10-15 mins');
            return NextResponse.json({
                success: true,
                message: 'No workshops to remind',
                count: 0,
            });
        }

        console.log(`📚 Found ${upcomingWorkshops.length} workshop(s) to remind`);

        let totalEmailsSent = 0;
        const results = [];

        // 3. Process each workshop
        for (const workshop of upcomingWorkshops) {
            try {
                // Get all enrolled students
                const enrollments = await Enrollment.find({
                    courseId: workshop._id,
                }).populate('userId', 'name email');

                if (!enrollments || enrollments.length === 0) {
                    console.log(`⚠️  No enrollments for "${workshop.title}"`);
                    continue;
                }

                console.log(`👥 Found ${enrollments.length} enrolled student(s) for "${workshop.title}"`);

                let emailsSentForWorkshop = 0;

                // Send email to each enrolled student
                for (const enrollment of enrollments) {
                    const student = enrollment.userId as any;

                    if (!student || !student.email) {
                        console.warn('⚠️  Skipping enrollment with missing student data');
                        continue;
                    }

                    // Format start time
                    const startTime = new Date(workshop.liveSession!.startDate).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZoneName: 'short',
                    });

                    // Send reminder email
                    const emailHtml = getWorkshopReminderEmailTemplate(
                        student.name,
                        workshop.title,
                        startTime,
                        workshop.liveSession!.zoomMeetingLink
                    );

                    const sent = await sendEmail({
                        to: student.email,
                        subject: `🟡 Your workshop "${workshop.title}" starts in 10 minutes!`,
                        html: emailHtml,
                    });

                    if (sent) {
                        emailsSentForWorkshop++;
                        totalEmailsSent++;
                    }
                }

                // Mark workshop as reminded
                workshop.lastReminderSent = new Date();
                await workshop.save();

                results.push({
                    workshopId: workshop._id,
                    title: workshop.title,
                    emailsSent: emailsSentForWorkshop,
                });

                console.log(`✅ Sent ${emailsSentForWorkshop} reminder(s) for "${workshop.title}"`);
            } catch (workshopError: any) {
                console.error(`❌ Error processing workshop "${workshop.title}":`, workshopError.message);
                results.push({
                    workshopId: workshop._id,
                    title: workshop.title,
                    error: workshopError.message,
                });
            }
        }

        console.log(`🎉 Cron job completed. Total emails sent: ${totalEmailsSent}`);

        return NextResponse.json({
            success: true,
            message: 'Workshop reminders processed',
            totalEmailsSent,
            workshopsProcessed: upcomingWorkshops.length,
            results,
        });
    } catch (error: any) {
        console.error('❌ Workshop reminder cron error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to process reminders',
                    code: 'CRON_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
