import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const contactSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    subject: z.string().min(3, 'Subject must be at least 3 characters'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
});

/**
 * POST /api/contact
 * Handle contact form submissions
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const validationResult = contactSchema.safeParse(body);
        if (!validationResult.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: validationResult.error.errors[0].message,
                        code: 'VALIDATION_ERROR',
                    },
                },
                { status: 400 }
            );
        }

        const { name, email, subject, message } = validationResult.data;

        // Send email to support
        try {
            const { sendEmail } = await import('@/lib/mail');

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">New Contact Form Submission</h2>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>From:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Subject:</strong> ${subject}</p>
                    </div>
                    <div style="background: white; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
                        <h3>Message:</h3>
                        <p style="white-space: pre-wrap;">${message}</p>
                    </div>
                    <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                        This is an automated message from the InnoAccess contact form.
                    </p>
                </div>
            `;

            // Send to company email
            await sendEmail({
                to: process.env.GMAIL_USER || 'innoaccess2@gmail.com',
                subject: `[Contact Form] ${subject}`,
                html: emailHtml,
            });

            // Send confirmation to user
            const confirmationHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #2563eb;">Thank You for Contacting InnoAccess!</h2>
                    <p>Dear ${name},</p>
                    <p>We have received your message and will get back to you as soon as possible.</p>
                    <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3>Your Message:</h3>
                        <p style="white-space: pre-wrap;">${message}</p>
                    </div>
                    <p>Best regards,<br><strong>The InnoAccess Team</strong></p>
                </div>
            `;

            await sendEmail({
                to: email,
                subject: 'Thank you for contacting InnoAccess',
                html: confirmationHtml,
            });

            return NextResponse.json({
                success: true,
                data: {
                    message: 'Your message has been sent successfully. We will get back to you soon!',
                },
            });
        } catch (emailError) {
            console.error('Failed to send contact email:', emailError);
            return NextResponse.json(
                {
                    success: false,
                    error: {
                        message: 'Failed to send email. Please try again or contact us directly.',
                        code: 'EMAIL_ERROR',
                    },
                },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            {
                success: false,
                error: {
                    message: 'An error occurred. Please try again.',
                    code: 'SERVER_ERROR',
                },
            },
            { status: 500 }
        );
    }
}
