/**
 * Email Notification Utility
 * Placeholder for email sending functionality
 * TODO: Integrate with Resend/SendGrid
 */

interface EmailOptions {
    to: string;
    subject: string;
    body: string;
    html?: string;
}

/**
 * Send email notification
 * Currently logs to console - integrate with email service later
 */
export async function sendEmail({ to, subject, body, html }: EmailOptions): Promise<boolean> {
    try {
        // TODO: Integrate with actual email service (Resend/SendGrid)
        console.log('📧 Email Notification:');
        console.log('To:', to);
        console.log('Subject:', subject);
        console.log('Body:', body);
        console.log('---');

        // Simulate successful email send
        return true;
    } catch (error) {
        console.error('Email send error:', error);
        return false;
    }
}

/**
 * Send application status update notification to candidate
 */
export async function sendApplicationStatusEmail(
    candidateEmail: string,
    candidateName: string,
    jobTitle: string,
    status: 'accepted' | 'rejected',
    companyName?: string,
    companyEmail?: string,
    companyPhone?: string
): Promise<boolean> {
    const isAccepted = status === 'accepted';

    const subject = isAccepted
        ? `Congratulations! Your application for ${jobTitle} has been accepted`
        : `Update on your application for ${jobTitle}`;

    let body: string;

    if (isAccepted) {
        body = `Dear ${candidateName},

We are pleased to inform you that your application for the position of ${jobTitle} has been accepted!

${companyName ? `Company: ${companyName}` : ''}

Next Steps:
The company will contact you soon to discuss the next steps. You can also reach out to them directly:

📧 Email: ${companyEmail || 'Will be provided by the company'}
📞 Phone: ${companyPhone || 'Will be provided by the company'}

We recommend checking your email regularly and responding promptly to any communication from the company.

Congratulations and best of luck with your new opportunity!

Best regards,
InnoAccess Team`;
    } else {
        body = `Dear ${candidateName},

Thank you for your interest in the position of ${jobTitle}.

After careful consideration, we have decided to move forward with other candidates whose qualifications more closely match our current needs.

We appreciate the time you invested in the application process and wish you the best in your job search.

Best regards,
InnoAccess Team`;
    }

    return sendEmail({
        to: candidateEmail,
        subject,
        body,
    });
}
