import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { connectDB } from '@/lib/db';
import { sendEmail } from '@/lib/mail';
import User from '@/models/User';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/admin/broadcast
 * Send broadcast email to all users
 */
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        // Check admin authorization
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json(
                { success: false, error: { message: 'Unauthorized', code: 'UNAUTHORIZED' } },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { subject, htmlContent } = body;

        // Validate input
        if (!subject || !htmlContent) {
            return NextResponse.json(
                { success: false, error: { message: 'Subject and message are required', code: 'VALIDATION_ERROR' } },
                { status: 400 }
            );
        }

        await connectDB();

        // Fetch all users
        const users = await User.find({ email: { $exists: true, $ne: null } }).select('email name').lean();

        if (users.length === 0) {
            return NextResponse.json(
                { success: false, error: { message: 'No users found', code: 'NO_USERS' } },
                { status: 404 }
            );
        }

        // Send emails
        let successCount = 0;
        let failureCount = 0;

        for (const user of users) {
            if (!user.email) continue;

            const personalizedHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>InnoAccess Announcement</h2>
        </div>
        <div class="content">
            <p>Dear ${user.name || 'User'},</p>
            ${htmlContent}
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>The InnoAccess Team</strong></p>
        </div>
        <div class="footer">
            <p>This is a broadcast message from InnoAccess Platform</p>
        </div>
    </div>
</body>
</html>
            `;

            const sent = await sendEmail({
                to: user.email,
                subject,
                html: personalizedHtml,
            });

            if (sent) {
                successCount++;
            } else {
                failureCount++;
            }
        }

        console.log(`📧 Broadcast completed: ${successCount} sent, ${failureCount} failed`);

        return NextResponse.json({
            success: true,
            data: {
                totalUsers: users.length,
                successCount,
                failureCount,
                message: `Successfully sent to ${successCount} out of ${users.length} users`,
            },
        });
    } catch (error: any) {
        console.error('❌ Broadcast email error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: error.message || 'Failed to send broadcast email',
                    code: 'BROADCAST_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
