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
