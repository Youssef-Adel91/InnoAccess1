# Security Configuration Guide

## Environment Variables Required

### Email Service (Gmail SMTP)
```env
GMAIL_USER=innoaccess2@gmail.com
GMAIL_PASS=euov shwf salv imzy  # Gmail App Password
```

> **How to get Gmail App Password:**
> 1. Go to Google Account Settings
> 2. Security → 2-Step Verification (enable if not already)
> 3. App Passwords → Generate new
> 4. Copy the 16-character password

---

### Cloudflare Turnstile (CAPTCHA)

```env
# Public key (visible in client-side code)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key_here

# Secret key (server-side only)
TURNSTILE_SECRET_KEY=your_secret_key_here
```

> **How to get Turnstile keys:**
> 1. Visit https://dash.cloudflare.com/
> 2. Go to "Turnstile"
> 3. Click "Add Site"
> 4. Enter your domain (use `localhost` for development)
> 5. Choose "Managed" challenge
> 6. Copy both Site Key and Secret Key

> **Free Tier:** 1,000,000 requests/month

---

### NextAuth Configuration

```env
NEXTAUTH_URL=https://inno-access1.vercel.app
NEXTAUTH_SECRET=your_random_secret_here
```

> **Generate NEXTAUTH_SECRET:**
> ```bash
> openssl rand -base64 32
> ```

---

### MongoDB Connection

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

---

## Deployment Checklist

### Before Deploying to Production:

#### 1. Run Database Migration
```bash
npm run migrate:verification
```
This marks all existing users as verified to prevent lockout.

#### 2. Set Environment Variables in Vercel
Go to Vercel Project Settings → Environment Variables and add all variables listed above.

#### 3. Test Email Sending
After deployment, register a test account and verify:
- Email arrives within 2 minutes
- OTP works correctly
- Welcome email sent after verification

#### 4. Test CAPTCHA
- Verify widget loads on registration page
- Submit form → should require CAPTCHA completion
- Check browser console for errors

#### 5. Test Rate Limiting
Try registering 4 times in a row → 4th attempt should be blocked with HTTP 429.

---

## Development Mode

### Running Locally Without CAPTCHA
If you don't set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, the CAPTCHA widget won't appear and verification will be skipped in development mode.

### Testing Email in Development
Emails will be sent from your Gmail account. Make sure `GMAIL_USER` and `GMAIL_PASS` are set in `.env.local`.

---

## Security Features Summary

| Feature | Status | Protection Level |
|---------|--------|------------------|
| Email Verification | ✅ Active | 🔒 Critical |
| Rate Limiting | ✅ Active | 🔒 High |
| CAPTCHA (Turnstile) | ✅ Active | 🔒 High |
| Password Hashing (bcrypt) | ✅ Active | 🔒 Critical |
| Input Validation (Zod) | ✅ Active | 🔒 Medium |
| Security Headers | ❌ Pending | 🔒 Medium |
| NoSQL Injection Prevention | ❌ Pending | 🔒 High |
| XSS Protection | ⚠️ Partial | 🔒 High |

---

## Troubleshooting

### CAPTCHA Not Showing
- **Cause:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` not set
- **Fix:** Add to `.env.local` and restart dev server

### Email Not Sending
- **Cause:** Invalid Gmail App Password or 2FA not enabled
- **Fix:** Regenerate App Password from Google Account settings

### Rate Limit Too Strict
- **Fix:** Edit `src/lib/rate-limit.ts` → Increase `RateLimits.REGISTER.max`

### Users Locked Out After Deployment
- **Cause:** Migration not run
- **Fix:** Run `npm run migrate:verification`

---

*Last Updated: 2026-01-21*
