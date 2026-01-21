# 🛡️ Security Deployment Checklist

## Pre-Deployment Steps

### 1. ✅ Run Database Migration
**Command:**
```bash
npm run migrate:verification
```

**What it does:** Marks all existing users as verified to prevent lockout.

**Expected Output:**
```
✅ Connected to database
📊 Found X users to migrate
✅ Migration completed successfully!
```

---

### 2. ✅ Set Environment Variables in Vercel

Go to: **Vercel Dashboard → Project → Settings → Environment Variables**

Add the following:

#### Required for Production:
```env
# Email Service
GMAIL_USER=innoaccess2@gmail.com
GMAIL_PASS=<your_16_char_gmail_app_password>

# Cloudflare Turnstile (CAPTCHA)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<get_from_cloudflare>
TURNSTILE_SECRET_KEY=<get_from_cloudflare>

# NextAuth
NEXTAUTH_URL=https://inno-access1.vercel.app
NEXTAUTH_SECRET=<generate_random_string>

# MongoDB
MONGODB_URI=mongodb+srv://...
```

#### How to Get Turnstile Keys:
1. Visit https://dash.cloudflare.com/
2. Navigate to "Turnstile"
3. Click "Add Site"
4. Domain: `inno-access1.vercel.app` (production) or `localhost` (dev)
5. Copy **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
6. Copy **Secret Key** → `TURNSTILE_SECRET_KEY`

---

### 3. ✅ Verify Security Features Are Active

#### Email Verification:
- [ ] `src/models/User.ts` has `isVerified`, `verificationToken`, `verificationTokenExpiry`
- [ ] `src/lib/otp.ts` exists
- [ ] `src/lib/mail.ts` configured with Nodemailer
- [ ] `src/app/api/auth/verify-email/route.ts` exists
- [ ] `src/app/api/auth/resend-verification/route.ts` exists
- [ ] `src/app/auth/verify-email/page.tsx` exists

#### Rate Limiting:
- [ ] `src/lib/rate-limit.ts` exists
- [ ] Registration API has rate limiting check
- [ ] Resend verification has rate limiting

#### CAPTCHA:
- [ ] `src/lib/turnstile.ts` exists
- [ ] `src/components/ui/TurnstileWidget.tsx` exists
- [ ] Registration form includes `<TurnstileWidget />`
- [ ] Registration API verifies token

#### Security Headers:
- [ ] `next.config.js` has `headers()` function
- [ ] CSP includes Turnstile domains

#### NoSQL Injection Prevention:
- [ ] `src/lib/sanitize.ts` exists

---

## Post-Deployment Verification

### Test 1: Email Verification Flow
1. Register new account with **real email**
2. Check inbox for OTP (should arrive in <2 minutes)
3. Enter OTP on verification page
4. Try to login → Should work
5. Try to login with unverified account → Should fail

**Expected Result:** ✅ All steps work correctly

---

### Test 2: Rate Limiting
Open browser console and run:
```javascript
for (let i = 0; i < 4; i++) {
  fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test' + i,
      email: `test${Date.now()}${i}@test.com`,
      password: 'Test123456',
      role: 'user'
    })
  }).then(r => console.log(i, r.status));
}
```

**Expected Result:** First 3 return `201`, 4th returns `429`

---

### Test 3: CAPTCHA Integration
1. Go to registration page
2. Fill form but **don't solve CAPTCHA**
3. Click "Create Account"
4. **Expected:** Error "Please complete the CAPTCHA verification"
5. Solve CAPTCHA
6. Submit form
7. **Expected:** Success

---

### Test 4: Security Headers
1. Visit https://securityheaders.com/
2. Enter your production URL
3. **Expected Score:** A or B

Check for these headers:
- ✅ Strict-Transport-Security
- ✅ X-Frame-Options
- ✅ X-Content-Type-Options
- ✅ Content-Security-Policy
- ✅ Permissions-Policy

---

### Test 5: NoSQL Injection Prevention
Try registering with malicious input:
```javascript
{
  "email": "test@test.com",
  "password": { "$ne": null },
  "name": "Test"
}
```

**Expected:** Request should be sanitized, no MongoDB error

---

## Common Issues & Solutions

### ❌ Email Not Received
**Cause:** Gmail App Password incorrect or 2FA not enabled

**Solution:**
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Generate new App Password (16 characters)
4. Update `GMAIL_PASS` in Vercel

---

### ❌ CAPTCHA Not Showing
**Cause:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` not set

**Solution:**
1. Add key to Vercel environment variables
2. Redeploy application

---

### ❌ Rate Limit Too Strict
**Cause:** Shared IP blocking legitimate users

**Solution:**
Edit `src/lib/rate-limit.ts`:
```typescript
REGISTER: {
  max: 5,  // Increase from 3
  window: 60 * 60 * 1000,
}
```

---

### ❌ Users Can't Login After Migration
**Cause:** Migration script not run

**Solution:**
```bash
npm run migrate:verification
```

---

## Security Monitoring (Post-Launch)

### Week 1 Metrics to Track:

1. **Email Verification Rate**
   - Target: >85% of users verify within 24 hours
   - Low rate = UX issue or emails going to spam

2. **Rate Limit Triggers**
   - Monitor IPs hitting rate limits
   - Investigate repeated blocks from same IP

3. **CAPTCHA Failure Rate**
   - High failure rate = Bot attack or UX issue

4. **Failed Login Attempts**
   - Spike = Potential credential stuffing attack

5. **Database Injection Attempts**
   - Check logs for sanitization warnings

---

## Final Security Score

After completing all steps:

| Category | Score |
|----------|-------|
| Identity Verification | 🟢 Excellent |
| Bot Protection | 🟢 Excellent |
| Rate Limiting | 🟢 Excellent |
| Input Validation | 🟡 Good |
| Infrastructure | 🟢 Excellent |
| **Overall** | **🟢 Production Ready** |

---

*Last Updated: 2026-01-21*  
*Next Review: Before production launch*
