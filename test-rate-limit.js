// Security Test 3: Rate Limiting Test
// Testing if rate limiting blocks repeated registration attempts

console.log('🔍 Rate Limiting Test - Registration Endpoint\n');
console.log('Attempting 4 rapid registration requests...\n');

const testEmail = `test${Date.now()}@test.com`;

async function testRateLimit() {
  const results = [];

  for (let i = 1; i <= 4; i++) {
    try {
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Test User ${i}`,
          email: `${i}-${testEmail}`,
          password: 'Test123456!',
          role: 'user'
        })
      });

      const data = await response.json();

      results.push({
        attempt: i,
        status: response.status,
        success: data.success,
        message: data.error?.message || data.data?.message || 'OK'
      });

      console.log(`Attempt ${i}:`);
      console.log(`  Status: ${response.status}`);
      console.log(`  Message: ${data.error?.message || data.data?.message || 'Success'}`);
      console.log('');

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.log(`Attempt ${i}: ❌ Error -`, error.message);
    }
  }

  // Analyze results
  console.log('\n🔍 Analysis:');
  const rateLimited = results.filter(r => r.status === 429);

  if (rateLimited.length > 0) {
    console.log(`✅ PASSED: Rate limiting triggered after ${results.length - rateLimited.length} attempts!`);
    console.log(`   ${rateLimited.length} request(s) were blocked with HTTP 429.`);
  } else if (results.length === 4 && results.every(r => r.status === 201 || r.status === 400)) {
    console.log('⚠️  WARNING: All 4 requests passed. Rate limiting may not be working.');
    console.log('   Expected: 3 attempts accepted, 4th blocked with 429.');
  } else {
    console.log('⚠️  UNEXPECTED: Mixed results. Check rate limit configuration.');
  }
}

testRateLimit();
