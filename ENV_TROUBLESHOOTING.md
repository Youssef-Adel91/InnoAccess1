# 🔧 Environment Variables Troubleshooting Guide

## Current Error Explained

**Error**: `CLIENT_FETCH_ERROR: Unexpected token '<', "<!DOCTYPE"... is not valid JSON`

**What it means**: 
- NextAuth is trying to call `/api/auth/session` (and other auth endpoints)
- The API route is crashing due to invalid environment variables
- Instead of returning JSON, it's returning an HTML error page
- That's why you see `<!DOCTYPE` instead of valid JSON

**Root Cause**: Your `.env.local` file still has issues with environment variables

---

## ✅ Step-by-Step Fix

### Step 1: Check Your `.env.local` File

Open: `d:\me\semester 5\innoAccess\project\InnoMVP\.env.local`

**Make sure ALL these variables are set properly:**

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/innoaccess?retryWrites=true&w=majority

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=jYjpvJ0Tg9z/kIkp2s3xQoH/Pfn+jJMs66CEiQSlkPE=

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# Paymob
PAYMOB_API_KEY=your_paymob_api_key_here
PAYMOB_INTEGRATION_ID_CARD=your_card_integration_id
PAYMOB_INTEGRATION_ID_WALLET=your_wallet_integration_id
PAYMOB_IFRAME_ID=your_iframe_id
PAYMOB_HMAC_SECRET=your_hmac_secret_here
```

### Step 2: Critical Checks

**✓ NEXTAUTH_SECRET**:
- Must be at least 32 characters
- Use this one I generated: `jYjpvJ0Tg9z/kIkp2s3xQoH/Pfn+jJMs66CEiQSlkPE=`
- No quotes around it
- No extra spaces

**✓ MONGODB_URI**:
- Must be a complete MongoDB connection string
- Example: `mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority`
- If you're using MongoDB Atlas, get it from your cluster connection page

**✓ All other variables**:
- Must have actual values (not placeholders like "your_api_key_here")
- OR temporarily comment them out if you don't have them yet

### Step 3: Temporary Solution (If You Don't Have All Credentials)

If you don't have Cloudinary or Paymob credentials yet, **comment them out** to at least get authentication working:

```env
# Database
MONGODB_URI=your_actual_mongodb_uri_here

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=jYjpvJ0Tg9z/kIkp2s3xQoH/Pfn+jJMs66CEiQSlkPE=

# Cloudinary (optional for now)
# CLOUDINARY_CLOUD_NAME=
# CLOUDINARY_API_KEY=
# CLOUDINARY_API_SECRET=

# Paymob (optional for now)
# PAYMOB_API_KEY=
# PAYMOB_INTEGRATION_ID_CARD=
# PAYMOB_INTEGRATION_ID_WALLET=
# PAYMOB_IFRAME_ID=
# PAYMOB_HMAC_SECRET=
```

**But then update `src/lib/env.ts` to make them optional temporarily:**

Change this in `src/lib/env.ts`:
```typescript
// Make these optional for now
CLOUDINARY_CLOUD_NAME: z.string().optional(),
CLOUDINARY_API_KEY: z.string().optional(),
CLOUDINARY_API_SECRET: z.string().optional(),

PAYMOB_API_KEY: z.string().optional(),
PAYMOB_INTEGRATION_ID_CARD: z.string().optional(),
PAYMOB_INTEGRATION_ID_WALLET: z.string().optional(),
PAYMOB_IFRAME_ID: z.string().optional(),
PAYMOB_HMAC_SECRET: z.string().optional(),
```

### Step 4: Restart Dev Server

1. **Stop all running servers** (Ctrl+C in both terminals)
2. Delete the `.next` folder to clear cache:
   ```bash
   rm -rf .next
   ```
   Or on Windows:
   ```bash
   rmdir /s /q .next
   ```
3. **Restart**:
   ```bash
   npm run dev
   ```

---

## 🔍 How to Verify It's Fixed

After restarting, you should see:
- ✅ Server starts without environment validation errors
- ✅ Homepage loads at http://localhost:3000 (or 3001)
- ✅ No errors in the terminal
- ✅ No "CLIENT_FETCH_ERROR" in browser console

---

## 🆘 Still Not Working?

**Check these common mistakes:**

1. **Typos in variable names** - they must match exactly
2. **Missing equals sign** - must be `KEY=value`, not `KEY = value`
3. **Spaces after values** - shouldn't have trailing spaces
4. **Wrong file** - make sure you're editing `.env.local`, not `.env.local.example`
5. **File not saved** - press Ctrl+S to save
6. **Old server still running** - kill all node processes and restart

**Quick test command:**
```bash
node -e "require('./src/lib/env.ts')"
```

This will immediately show if your env vars are valid.

---

## 📋 What Each Variable Is For

| Variable | Purpose | Required Now? |
|----------|---------|---------------|
| MONGODB_URI | Database connection | ✅ YES |
| NEXTAUTH_URL | Auth callback URL | ✅ YES |
| NEXTAUTH_SECRET | Session encryption | ✅ YES |
| CLOUDINARY_* | Image/file uploads | ❌ Optional |
| PAYMOB_* | Payment processing | ❌ Optional |

**Priority**: Get the first 3 working, then add the others later when needed.
