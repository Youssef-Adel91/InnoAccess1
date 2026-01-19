// Simple test to check if Gmail credentials are correct
const nodemailer = require('nodemailer');

async function testGmail() {
    console.log('🧪 Testing Gmail SMTP connection...\n');

    // Create transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'innoaccess2@gmail.com',
            pass: 'euov shwf salv imzy',
        },
    });

    try {
        // Verify connection
        console.log('📡 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!\n');

        // Send test email
        console.log('📧 Sending test email...');
        const info = await transporter.sendMail({
            from: '"InnoAccess Test" <innoaccess2@gmail.com>',
            to: 'innoaccess2@gmail.com',
            subject: 'Test Email from InnoAccess',
            html: '<h1>✅ Email System Working!</h1><p>If you see this, nodemailer is configured correctly.</p>',
        });

        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('\n🎉 All tests passed! Email system is working correctly.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('\n📋 Full error details:');
        console.error(error);

        if (error.code === 'EAUTH') {
            console.error('\n⚠️  Authentication failed! Possible issues:');
            console.error('   1. Gmail App Password is incorrect');
            console.error('   2. App Password has expired');
            console.error('   3. Less secure apps access is disabled');
            console.error('\n💡 Solution: Generate a new App Password from Google Account settings');
        }
    }
}

testGmail();
