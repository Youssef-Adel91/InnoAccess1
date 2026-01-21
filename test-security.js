// Security Test: NoSQL Injection Prevention
// Testing verify-email endpoint with malicious payload

fetch('http://localhost:3000/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: { "$ne": null },  // Malicious NoSQL operator
        otp: "123456"
    })
})
    .then(r => {
        console.log('\n📊 HTTP Status:', r.status);
        return r.json();
    })
    .then(data => {
        console.log('\n✅ Response Body:');
        console.log(JSON.stringify(data, null, 2));

        // Analyze result
        console.log('\n🔍 Security Analysis:');
        if (data.error && data.error.message === 'Invalid email address') {
            console.log('✅ PASSED: NoSQL injection was blocked!');
            console.log('   The sanitizer successfully removed the $ne operator.');
        } else if (data.error && data.error.message === 'User not found') {
            console.log('❌ FAILED: Injection reached the database!');
            console.log('   The sanitizer is NOT working properly.');
        } else {
            console.log('⚠️  UNEXPECTED: Got different response than expected.');
        }
    })
    .catch(err => {
        console.error('\n❌ Request Error:', err.message);
    });
