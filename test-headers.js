// Security Test 2: Security Headers Check
// Testing if security headers are properly configured

console.log('🔍 Security Headers Test\n');
console.log('Testing endpoint: http://localhost:3000\n');

fetch('http://localhost:3000')
    .then(response => {
        console.log('📊 Response Status:', response.status, '\n');

        console.log('🛡️ Security Headers Analysis:\n');

        const headers = [
            'x-frame-options',
            'x-content-type-options',
            'strict-transport-security',
            'content-security-policy',
            'x-xss-protection',
            'referrer-policy',
            'permissions-policy'
        ];

        let passedCount = 0;
        let totalHeaders = headers.length;

        headers.forEach(header => {
            const value = response.headers.get(header);
            if (value) {
                console.log(`✅ ${header}: ${value}`);
                passedCount++;
            } else {
                console.log(`❌ ${header}: NOT FOUND`);
            }
        });

        console.log('\n📈 Score:', passedCount, '/', totalHeaders);

        if (passedCount === totalHeaders) {
            console.log('\n🎉 ALL SECURITY HEADERS PRESENT! Production Ready!');
        } else if (passedCount >= 5) {
            console.log('\n⚠️  GOOD but missing some headers. Review next.config.js');
        } else {
            console.log('\n❌ FAILED: Critical headers missing!');
        }
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
    });
