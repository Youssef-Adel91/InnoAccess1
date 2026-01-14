# InnoAccess - Accessible Job Portal & LMS

An accessibility-first job board and learning management system designed for visually impaired individuals. Built with Next.js 15, TypeScript, MongoDB, and Paymob payment integration.

## 🌟 Features

- **Accessibility First**: WCAG 2.1 AAA compliant
- **Screen Reader Optimized**: Full NVDA, JAWS, and VoiceOver support
- **Job Board**: Post and apply for jobs with accessibility features
- **Learning Management System**: Courses with accessible video players
- **Payment Integration**: Paymob (Accept) for Egyptian market (Cards & Wallets)
- **Multi-role System**: Users, Companies, Trainers, and Admins

## 📋 Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account for file storage
- Paymob merchant account for payments

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

You need to create a `.env.local` file in the root directory. Use the `.env.local.example` as a template:

```bash
cp .env.local.example .env.local
```

Then fill in your actual credentials:

```env
# Database
MONGODB_URI=mongodb+srv://your_username:your_password@cluster0.xxxxx.mongodb.net/?appName=Cluster0

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_32_character_secret_here

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Paymob (Payment Gateway)
PAYMOB_API_KEY=your_paymob_api_key
PAYMOB_INTEGRATION_ID_CARD=your_card_integration_id
PAYMOB_INTEGRATION_ID_WALLET=your_wallet_integration_id
PAYMOB_IFRAME_ID=your_iframe_id
PAYMOB_HMAC_SECRET=your_hmac_secret
```

**Important Notes:**
- MongoDB and Cloudinary credentials are already available in `env.txt`
- Paymob credentials must be obtained from your Paymob merchant dashboard
- Generate a secure NEXTAUTH_SECRET: `openssl rand -base64 32`

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

## 🏗️ Project Structure

```
InnoMVP/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx         # Root layout with skip links
│   │   └── page.tsx           # Homepage
│   ├── features/              # Feature-based modules
│   │   ├── auth/              # Authentication & authorization
│   │   ├── jobs/              # Job board features
│   │   ├── lms/               # Learning management system
│   │   └── accessibility/     # Accessibility utilities
│   │       ├── utils/
│   │       │   ├── aria.ts    # ARIA helpers
│   │       │   └── focus.ts   # Focus management
│   │       └── README.md      # Accessibility guidelines
│   ├── lib/                   # Shared utilities
│   │   ├── env.ts            # Environment validation (Zod)
│   │   ├── db.ts             # MongoDB connection
│   │   └── paymob.ts         # Payment gateway
│   └── types/                 # Global TypeScript types
├── INNOACCESS_PRD.md         # Product Requirements Document
├── PAYMOB_CONTEXT.md         # Paymob integration guide
└── package.json
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint with accessibility checks

## ♿ Accessibility Features

### Built-in Accessibility

- **Skip Links**: "Skip to main content" on every page
- **Semantic HTML**: Proper use of `<main>`, `<nav>`, `<article>`, `<button>`
- **ARIA Labels**: All interactive elements have proper labels
- **Focus Management**: Visible focus indicators and logical tab order
- **Keyboard Navigation**: All features accessible via keyboard
- **Screen Reader Support**: Optimized for NVDA, JAWS, and VoiceOver

### ESLint Accessibility Rules

The project enforces strict accessibility rules via `eslint-plugin-jsx-a11y`:
- Mandatory alt text for images
- Proper ARIA attributes
- Interactive element requirements
- Label associations

## 💳 Payment Integration (Paymob)

The platform uses Paymob Accept API for payment processing:

1. **Authentication**: Get auth token using API key
2. **Order Registration**: Create order in Paymob system
3. **Payment Key**: Generate key for payment iframe/wallet
4. **Webhook Verification**: HMAC-SHA512 signature validation

See [`PAYMOB_CONTEXT.md`](./PAYMOB_CONTEXT.md) for detailed integration guide.

### Payment Methods Supported
- Credit/Debit Cards (Visa, Mastercard, Meeza)
- Mobile Wallets (Vodafone Cash, Orange Cash, etc.)

## 🗄️ Database

MongoDB connection is managed with global caching to prevent connection issues in serverless environments. The connection utility handles:
- Connection pooling (5-10 connections)
- Automatic reconnection
- Graceful error handling

## 📚 Documentation

- **[PRD](./INNOACCESS_PRD.md)**: Complete product requirements
- **[Paymob Guide](./PAYMOB_CONTEXT.md)**: Payment integration details
- **[Accessibility README](./src/features/accessibility/README.md)**: WCAG guidelines

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB (via Mongoose)
- **Authentication**: NextAuth.js
- **Payment**: Paymob (Accept API)
- **File Storage**: Cloudinary
- **Validation**: Zod
- **Icons**: Lucide React
- **Accessibility**: eslint-plugin-jsx-a11y

## 🔐 Environment Variables

All environment variables are validated at startup using Zod schemas. The application will throw clear errors if required variables are missing or invalid.

## 📝 License

This project is for InnoAccess platform development.

## 🤝 Contributing

When contributing, please ensure all code follows accessibility best practices:
1. Run `npm run lint` before committing
2. Test with keyboard-only navigation
3. Verify screen reader compatibility
4. Maintain WCAG 2.1 AAA standards
