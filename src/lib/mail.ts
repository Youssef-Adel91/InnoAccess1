import nodemailer from 'nodemailer';

interface PaymentEmailParams {
    recipientEmail: string;
    recipientName: string;
    courseName: string;
    amount: number;
    orderId: string;
    paymentMethod: string;
    status: 'approved' | 'rejected';
    rejectionReason?: string;
}

interface BroadcastEmailParams {
    recipientEmail: string;
    recipientName: string;
    subject: string;
    message: string;
}

interface VerificationEmailParams {
    recipientEmail: string;
    recipientName: string;
    otp: string;
}

interface WelcomeEmailParams {
    recipientEmail: string;
    recipientName: string;
}

interface SendEmailOptions {
    to: string | string[];
    subject: string;
    html: string;
}

/**
 * Create Nodemailer transporter with Gmail SMTP
 */
function createTransporter() {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
        throw new Error('Email credentials missing in environment variables');
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
        },
    });
}

/**
 * Send email using Gmail SMTP
 * @param options - Email options (to, subject, html)
 * @returns Promise<boolean> - true if sent successfully
 */
export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
    try {
        const transporter = createTransporter();

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
 * Send verification email with OTP
 */
export async function sendVerificationEmail({ recipientEmail, recipientName, otp }: VerificationEmailParams): Promise<boolean> {
    const subject = '🔐 Verify Your Email - InnoAccess';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .otp-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 8px; margin: 30px 0; }
            .footer { background: #f9fafb; text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 28px;">🔐 Verify Your Email</h1>
            </div>
            <div class="content">
                <h2>Hi ${recipientName}!</h2>
                <p>Thank you for registering with <strong>InnoAccess</strong>. To complete your registration and secure your account, please verify your email address.</p>
                
                <p style="margin-top: 30px;"><strong>Your verification code is:</strong></p>
                <div class="otp-box">${otp}</div>
                
                <div class="warning">
                    <strong>⚠️ Important:</strong><br>
                    • This code expires in <strong>15 minutes</strong><br>
                    • Do not share this code with anyone<br>
                    • If you didn't request this, ignore this email
                </div>
                
                <p>Enter this code on the verification page to activate your account and start your learning journey!</p>
                
                <p style="margin-top: 40px; color: #6b7280;">
                    Best regards,<br>
                    <strong>The InnoAccess Team</strong>
                </p>
            </div>
            <div class="footer">
                <p>This is an automated message from InnoAccess Platform</p>
                <p>innoaccess2@gmail.com</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return sendEmail({ to: recipientEmail, subject, html });
}

/**
 * Send welcome email after successful verification
 */
export async function sendWelcomeEmail({ recipientEmail, recipientName }: WelcomeEmailParams): Promise<boolean> {
    const subject = '🎉 Welcome to InnoAccess!';
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #16a34a 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
            .content { padding: 40px 30px; }
            .success-box { background: #dcfce7; border-left: 4px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
            .footer { background: #f9fafb; text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="margin: 0; font-size: 32px;">🎉 Welcome!</h1>
            </div>
            <div class="content">
                <h2>Hi ${recipientName}!</h2>
                
                <div class="success-box">
                    <strong>✅ Your account is now verified and ready to use!</strong>
                </div>
                
                <p>Welcome to <strong>InnoAccess</strong> - the inclusive learning platform designed for everyone.</p>
                
                <h3>🚀 What's Next?</h3>
                <ul style="line-height: 2;">
                    <li>Explore our <strong>courses</strong> and start learning</li>
                    <li>Complete your <strong>profile</strong> for a personalized experience</li>
                    <li>Apply for <strong>jobs</strong> from inclusive employers</li>
                    <li>Customize your <strong>accessibility settings</strong></li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXTAUTH_URL || 'https://inno-access1.vercel.app'}/dashboard" class="button">Go to Dashboard</a>
                </div>
                
                <p style="margin-top: 40px; color: #6b7280;">
                    If you have any questions, feel free to reach out to us at <strong>innoaccess2@gmail.com</strong>
                </p>
                
                <p style="color: #6b7280;">
                    Best regards,<br>
                    <strong>The InnoAccess Team</strong>
                </p>
            </div>
            <div class="footer">
                <p>This is an automated message from InnoAccess Platform</p>
                <p>innoaccess2@gmail.com</p>
            </div>
        </div>
    </body>
    </html>
    `;

    return sendEmail({ to: recipientEmail, subject, html });
}

/**
 * Missing template functions for backward compatibility
 */
export function getTrainerApprovalEmailTemplate(name: string): string {
    return `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #667eea;">🎉 Congratulations ${name}!</h1>
            <p>Your trainer application has been approved.</p>
            <a href="${process.env.NEXTAUTH_URL}/dashboard/trainer" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
        </div>
    `;
}

export function getTrainerRejectionEmailTemplate(name: string): string {
    return `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
            <h1>Application Update</h1>
            <p>Hello ${name}, unfortunately we are unable to approve your trainer application at this time.</p>
        </div>
    `;
}

export function getPasswordResetEmailTemplate(resetUrl: string): string {
    return `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
            <h1>Reset Your Password</h1>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>This link expires in 1 hour.</p>
        </div>
    `;
}

export function getWorkshopReminderEmailTemplate(userName: string, workshopTitle: string, date: string): string {
    return `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
            <h1>Workshop Reminder 📅</h1>
            <p>Hello ${userName}, reminder for: <strong>${workshopTitle}</strong> on ${date}</p>
        </div>
    `;
}

export function getJobAcceptanceEmailTemplate(userName: string, jobTitle: string): string {
    return `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
            <h1>Congratulations! 🎉</h1>
            <p>Hello ${userName}, you have been accepted for: <strong>${jobTitle}</strong></p>
        </div>
    `;
}
