import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { sendEmail } = await import('@/lib/mail');

        console.log('🔍 Testing email with credentials:');
        console.log('   GMAIL_USER:', process.env.GMAIL_USER);
        console.log('   GMAIL_PASS:', process.env.GMAIL_PASS ? '✅ Set' : '❌ Missing');

        await sendEmail({
            to: process.env.GMAIL_USER || 'innoaccess2@gmail.com',
            subject: 'Test Email from InnoAccess',
            html: '<h1>Test Successful!</h1><p>If you see this, email is working.</p>',
        });

        return NextResponse.json({
            success: true,
            message: 'Email sent! Check your inbox.'
        });
    } catch (error: any) {
        console.error('❌ Email test failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
