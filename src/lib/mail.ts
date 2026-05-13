import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// ---------------------------------------------------------
// ✅ New Security Functions (OTP & Verification)
// ---------------------------------------------------------

/**
 * Options accepted by sendVerificationEmail.
 * Using an object so callers don't have to remember argument order.
 */
interface VerificationEmailOptions {
  recipientEmail: string;
  recipientName: string;
  otp: string;
}

/**
 * Send an OTP verification email.
 * Always logs the OTP to the console so it can be retrieved from
 * Vercel Function Logs (or the local terminal) even if SMTP fails.
 */
export async function sendVerificationEmail(options: VerificationEmailOptions): Promise<boolean> {
  const { recipientEmail, recipientName, otp } = options;

  // ── DEV / PROD BYPASS ─────────────────────────────────────────────────────
  // The OTP is ALWAYS printed here.  On Vercel, open the Dashboard →
  // Functions → Logs tab to find it even if the email is never delivered.
  console.log('============================================');
  console.log('🔑 OTP VERIFICATION CODE');
  console.log(`📧 Email : ${recipientEmail}`);
  console.log(`👤 Name  : ${recipientName}`);
  console.log(`🔢 OTP   : ${otp}`);
  console.log('⏰ Expires in 15 minutes');
  console.log('============================================');
  // ─────────────────────────────────────────────────────────────────────────

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #2563eb; text-align: center;">Verify Your Email</h2>
      <p style="font-size: 16px; color: #333;">Hello ${recipientName},</p>
      <p style="font-size: 16px; color: #333;">Use the code below to verify your email address. This code will expire in 15 minutes.</p>
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${otp}</span>
      </div>
      <p style="font-size: 14px; color: #666;">If you didn't request this, please ignore this email.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: recipientEmail,
      subject: 'Verify Your Email - InnoAccess',
      html,
    });
    return true;
  } catch (error) {
    // Non-fatal: the OTP is already in the console / Vercel logs above.
    console.error('⚠️  SMTP transport failed (OTP still available in logs above):', error);
    return false;
  }
}

/**
 * Options accepted by sendWelcomeEmail.
 */
interface WelcomeEmailOptions {
  recipientEmail: string;
  recipientName: string;
}

/**
 * Send a welcome email after successful email verification.
 */
export async function sendWelcomeEmail(options: WelcomeEmailOptions): Promise<boolean> {
  const { recipientEmail, recipientName } = options;

  console.log(`✅ Welcome email triggered for: ${recipientEmail} (${recipientName})`);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to InnoAccess! 🚀</h2>
      <p>Hello ${recipientName},</p>
      <p>Your email has been successfully verified. You can now access all features of the platform.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: recipientEmail,
      subject: 'Welcome to InnoAccess',
      html,
    });
    return true;
  } catch (error) {
    console.error('Welcome email failed:', error);
    return false;
  }
}

// ---------------------------------------------------------
// 🔧 Legacy Functions (Required for Build)
// ---------------------------------------------------------

export const getTrainerApprovalEmailTemplate = (name: string) => `
  <h1>Congratulations ${name}!</h1>
  <p>Your trainer application has been approved. You can now create courses.</p>
`;

export const getTrainerRejectionEmailTemplate = (name: string) => `
  <h1>Hello ${name}</h1>
  <p>Thank you for your interest. Unfortunately, your application was not approved at this time.</p>
`;

export const getPasswordResetEmailTemplate = (userName: string, resetUrl: string) => `
  <h1>Reset Your Password</h1>
  <p>Hello ${userName},</p>
  <p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>
`;

export const getWorkshopReminderEmailTemplate = (userName: string, workshopTitle: string, date: string) => `
  <h1>Workshop Reminder</h1>
  <p>Hello ${userName}, this is a reminder for your workshop "${workshopTitle}" on ${date}.</p>
`;

export const getJobAcceptanceEmailTemplate = (userName: string, jobTitle: string) => `
  <h1>Congratulations!</h1>
  <p>Dear ${userName}, you have been accepted for the position: ${jobTitle}.</p>
`;

// ---------------------------------------------------------
// 📧 Payment & Broadcast Functions
// ---------------------------------------------------------

export async function sendEmail(options: { to: string; subject: string; html: string }) {
  return await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}
