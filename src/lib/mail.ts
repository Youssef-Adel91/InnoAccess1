import nodemailer from 'nodemailer';

interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html: string;
}

/**
 * Send email using Gmail SMTP
 * @param options - Email options (to, subject, html)
 * @returns Promise<boolean> - true if sent successfully
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
    try {
        // Validate environment variables
        if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
            console.error('❌ Email credentials missing in environment variables');
            return false;
        }

        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
        });

        // Convert to array if single recipient
        const recipients = Array.isArray(to) ? to : [to];

        // Send email
        await transporter.sendMail({
            from: `"InnoAccess" <${process.env.GMAIL_USER}>`,
            to: recipients.join(', '),
            subject,
            html,
        });

        console.log(`✅ Email sent successfully to: ${recipients.join(', ')}`);
        return true;
    } catch (error: any) {
        console.error('❌ Failed to send email:', error.message);
        return false;
    }
}

/**
 * Email template for job application acceptance
 */
export function getJobAcceptanceEmailTemplate(jobTitle: string, applicantName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Congratulations!</h1>
        </div>
        <div class="content">
            <h2>Dear ${applicantName},</h2>
            <p>We are pleased to inform you that your application for the position of <strong>${jobTitle}</strong> has been <strong>accepted</strong>!</p>
            
            <p>We were impressed with your qualifications and believe you will be a great addition to our team.</p>
            
            <h3>Next Steps:</h3>
            <p>Please contact us at <strong>innoaccess2@gmail.com</strong> to proceed with the onboarding process and discuss further details.</p>
            
            <p>We look forward to working with you!</p>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>The InnoAccess Team</strong><br>
            innoaccess2@gmail.com</p>
        </div>
        <div class="footer">
            <p>This is an automated message from InnoAccess Platform</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Email template for trainer application approval
 */
export function getTrainerApprovalEmailTemplate(trainerName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #16a34a; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .success-box { background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Trainer Application Approved!</h1>
        </div>
        <div class="content">
            <h2>Dear ${trainerName},</h2>
            <p>Congratulations! We are excited to inform you that your trainer application has been <strong>approved</strong>!</p>
            
            <div class="success-box">
                <strong>✅ Welcome to the InnoAccess Training Team!</strong><br>
                You can now create and publish courses on our platform to help students learn and grow.
            </div>
            
            <h3>What's next?</h3>
            <ul>
                <li>Log in to your account - your role has been updated to <strong>Trainer</strong></li>
                <li>Access the Trainer Dashboard to create your first course</li>
                <li>Upload course materials and video lessons</li>
                <li>Start making an impact by sharing your knowledge!</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="${process.env.NEXTAUTH_URL || 'https://inno-access1.vercel.app'}/trainer/dashboard" class="button">Go to Trainer Dashboard</a>
            </p>
            
            <p>If you have any questions or need assistance getting started, feel free to reach out to us.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>The InnoAccess Team</strong><br>
            innoaccess2@gmail.com</p>
        </div>
        <div class="footer">
            <p>This is an automated message from InnoAccess Platform</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Email template for trainer application rejection
 */
export function getTrainerRejectionEmailTemplate(trainerName: string, rejectionReason: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .reason-box { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Trainer Application Update</h1>
        </div>
        <div class="content">
            <h2>Dear ${trainerName},</h2>
            <p>Thank you for your interest in becoming a trainer on the InnoAccess platform.</p>
            <p>After careful review, we regret to inform you that your trainer application has not been approved at this time.</p>
            
            <div class="reason-box">
                <strong>Reason for Rejection:</strong><br>
                ${rejectionReason}
            </div>
            
            <h3>What you can do:</h3>
            <ul>
                <li>Review the feedback provided above</li>
                <li>Consider addressing the mentioned areas and reapply in the future</li>
                <li>Contact us at <strong>innoaccess2@gmail.com</strong> if you have questions or need clarification</li>
                <li>Continue using the platform as a student to learn and grow</li>
            </ul>
            
            <p>We appreciate your understanding and encourage you to continue developing your skills. You're welcome to reapply once you've addressed the feedback.</p>
            
            <p style="margin-top: 30px;">Best regards,<br>
            <strong>The InnoAccess Team</strong><br>
            innoaccess2@gmail.com</p>
        </div>
        <div class="footer">
            <p>This is an automated message from InnoAccess Platform</p>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Email template for workshop reminder (10 mins before start)
 */
export function getWorkshopReminderEmailTemplate(
    studentName: string,
    courseTitle: string,
    startTime: string,
    zoomLink: string
): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #eab308 0%, #f59e0b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #fffbeb; padding: 30px; border-radius: 0 0 10px 10px; border: 2px solid #fbbf24; }
        .highlight-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .button { display: inline-block; padding: 15px 40px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3); }
        .button:hover { background-color: #b91c1c; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .emoji { font-size: 24px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="emoji">🟡</div>
            <h1 style="margin: 10px 0;">Workshop Starting Soon!</h1>
        </div>
        <div class="content">
            <h2>Hi ${studentName},</h2>
            <p>This is a friendly reminder that your workshop is starting in <strong>10 minutes</strong>!</p>
            
            <div class="highlight-box">
                <strong>📚 Workshop:</strong> ${courseTitle}<br>
                <strong>🕒 Start Time:</strong> ${startTime}<br>
                <strong>⏰ Status:</strong> <span style="color: #d97706; font-weight: bold;">STARTING SOON</span>
            </div>
            
            <h3 style="color: #b91c1c;">⚠️ Don't Miss Out!</h3>
            <p>Click the button below to join the Zoom meeting now. We recommend joining a few minutes early to test your audio and video.</p>
            
            <div style="text-align: center;">
                <a href="${zoomLink}" class="button">🔴 Join Workshop Now</a>
            </div>
            
            <h3>📋 Quick Checklist:</h3>
            <ul style="line-height: 2;">
                <li>✅ Ensure you have <strong>Zoom</strong> installed</li>
                <li>✅ Test your <strong>microphone</strong> and <strong>camera</strong></li>
                <li>✅ Find a <strong>quiet space</strong> with good internet</li>
                <li>✅ Have a <strong>notebook</strong> ready for notes</li>
            </ul>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #fbbf24;">
                If you have any issues joining, please contact us immediately.<br><br>
                Best regards,<br>
                <strong>The InnoAccess Team</strong><br>
                innoaccess2@gmail.com
            </p>
        </div>
        <div class="footer">
            <p>This is an automated reminder from InnoAccess Platform</p>
        </div>
    </div>
</body>
</html>
    `;
}


/**
 * Email template for password reset
 */
export function getPasswordResetEmailTemplate(userName: string, resetLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 2px solid #3b82f6; }
        .button { display: inline-block; padding: 15px 40px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; font-size: 16px; }
        .warning-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div style="font-size: 24px;">🔐</div>
            <h1>Reset Your Password</h1>
        </div>
        <div class="content">
            <h2>Hi ${userName},</h2>
            <p>We received a request to reset your password for your InnoAccess account.</p>
            <div style="text-align: center;">
                <a href="${resetLink}" class="button">🔐 Reset Password</a>
            </div>
            <div class="warning-box">
                <strong>⚠️ Important:</strong><br>
                • This link expires in <strong>1 hour</strong><br>
                • If you didn't request this, ignore this email
            </div>
            <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>The InnoAccess Team</strong><br>
                innoaccess2@gmail.com
            </p>
        </div>
        <div class="footer">
            <p>This is an automated message from InnoAccess Platform</p>
        </div>
    </div>
</body>
</html>
    `;
}

