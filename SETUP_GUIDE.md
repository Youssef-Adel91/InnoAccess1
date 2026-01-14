# InnoAccess - Setup Guide

## ⚡ Quick Setup (5 minutes)

Follow these steps to get the InnoAccess platform running on your local machine.

### Step 1: Verify Node.js Installation

```bash
node --version    # Should be 18.0.0 or higher
npm --version     # Should be 9.0.0 or higher
```

### Step 2: Install Dependencies

Dependencies are already installed! If you need to reinstall:

```bash
npm install
```

### Step 3: Configure Environment Variables

**IMPORTANT:** You must create a `.env.local` file before running the application.

1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Open `.env.local` and fill in the values:

   **Already Available (from `env.txt`):**
   - ✅ `MONGODB_URI` - Already in env.txt
   - ✅ `CLOUDINARY_CLOUD_NAME` - Already in env.txt
   - ✅ `CLOUDINARY_API_KEY` - Already in env.txt
   - ✅ `CLOUDINARY_API_SECRET` - Already in env.txt

   **Generate New:**
   - `NEXTAUTH_SECRET` - Run: `openssl rand -base64 32`

   **Get from Paymob Dashboard (https://accept.paymob.com):**
   - ❌ `PAYMOB_API_KEY`
   - ❌ `PAYMOB_INTEGRATION_ID_CARD`
   - ❌ `PAYMOB_INTEGRATION_ID_WALLET`
   - ❌ `PAYMOB_IFRAME_ID`
   - ❌ `PAYMOB_HMAC_SECRET`

### Step 4: Start Development Server

```bash
npm run dev
```

The application will start at **http://localhost:3000**

### Step 5: Verify Setup

1. **Open your browser** to http://localhost:3000
2. **Test keyboard navigation:**
   - Press `Tab` - Should see skip link appear
   - Press `Enter` - Should jump to main content
   - Continue pressing `Tab` - Should see focus indicators

3. **Check console** - Should see MongoDB connection message

---

## 🔧 Troubleshooting

### Error: "Invalid environment variables"

**Problem:** Missing or invalid environment variables.

**Solution:**
1. Ensure `.env.local` file exists in the root directory
2. Verify all required variables are filled in
3. Check `env.txt` for MongoDB and Cloudinary credentials

### Error: "MongoDB connection failed"

**Problem:** Invalid MongoDB URI or network issues.

**Solution:**
1. Verify `MONGODB_URI` in `.env.local` matches `env.txt`
2. Check your internet connection
3. Ensure MongoDB Atlas cluster is active

### Error: "Module not found"

**Problem:** Dependencies not installed.

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 What's Next?

### Phase 2: Core Features Development

The infrastructure is ready! Next steps include:

1. **Authentication System**
   - NextAuth.js setup with custom provider
   - Social login (Google/LinkedIn)
   - Role-based access control

2. **Database Models**
   - User schema with accessibility settings
   - Job schema with company references
   - Course schema with modules
   - Application and Enrollment schemas

3. **API Routes**
   - User registration and login
   - Job CRUD operations
   - Course management
   - Payment webhooks

4. **UI Components**
   - Accessible form components
   - Job listing cards
   - Course cards
   - Video player with keyboard controls

---

## 📚 Available Scripts

- `npm run dev` - Start development server (with hot reload)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint with accessibility checks

---

## 🎯 Testing Accessibility

### Screen Reader Testing

**Windows (NVDA):**
1. Download NVDA: https://www.nvaccess.org/download/
2. Install and launch NVDA
3. Navigate to http://localhost:3000
4. Use arrow keys to navigate content

**macOS (VoiceOver):**
1. Press `Cmd + F5` to enable VoiceOver
2. Navigate to http://localhost:3000
3. Use `Ctrl + Option + Arrow keys` to navigate

### Keyboard-Only Testing

1. **DO NOT use your mouse**
2. Press `Tab` to navigate forward
3. Press `Shift + Tab` to navigate backward
4. Press `Enter` to activate buttons/links
5. Press `Escape` to close modals

All features must be fully accessible via keyboard!

---

## 💡 Development Tips

1. **Run ESLint before committing:**
   ```bash
   npm run lint
   ```

2. **Test with different screen readers:**
   - NVDA (Windows) - Free
   - JAWS (Windows) - Commercial
   - VoiceOver (macOS/iOS) - Built-in

3. **Use browser DevTools Accessibility tab:**
   - Chrome DevTools → More Tools → Accessibility
   - Inspect ARIA labels and roles

4. **Follow semantic HTML:**
   - Use `<button>`, not `<div onClick>`
   - Use `<nav>`, `<main>`, `<article>`, `<section>`
   - Never skip heading levels

---

## 🔐 Security Notes

- ✅ `.env.local` is in `.gitignore` - Never commit it!
- ✅ Environment validation runs at startup
- ✅ HMAC verification for Paymob webhooks
- ✅ MongoDB connection uses secure connection string

---

## 📞 Need Help?

- **PRD:** See `INNOACCESS_PRD.md` for complete requirements
- **Paymob Guide:** See `PAYMOB_CONTEXT.md` for payment integration
- **Accessibility:** See `src/features/accessibility/README.md`
- **Project README:** See `README.md` for detailed documentation

---

## ✅ Setup Checklist

- [ ] Node.js 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] `.env.local` created and configured
- [ ] MongoDB connection working
- [ ] Development server running (`npm run dev`)
- [ ] Keyboard navigation tested
- [ ] ESLint passes (`npm run lint`)
- [ ] Production build successful (`npm run build`)

Once all items are checked, you're ready to start Phase 2 development! 🚀
