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
            const { sendEmail } = await import('@/lib/email');

            const emailBody = `
New Contact Form Submission from InnoAccess

From: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This is an automated message from the InnoAccess contact form.
`;

            await sendEmail({
                to: process.env.GMAIL_USER || 'innoaccess2@gmail.com',
                subject: `[Contact Form] ${subject}`,
                body: emailBody,
            });

            // Also send confirmation to user
            await sendEmail({
                to: email,
                subject: 'Thank you for contacting InnoAccess',
                body: `Dear ${name},

Thank you for reaching out to InnoAccess. We have received your message and will get back to you as soon as possible.

Your Message:
${message}

Best regards,
InnoAccess Team`,
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
