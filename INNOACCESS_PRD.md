# Product Requirements Document (PRD) - InnoAccess

**Version:** 1.0
**Project Name:** InnoAccess (Accessible Job Portal & LMS)
**Target Audience:** Visually Impaired Individuals, Inclusive Companies, Trainers.

## 1. Executive Summary

InnoAccess is a dual-purpose platform combining a Job Board (similar to Wuzzuf/LinkedIn) and a Learning Management System (LMS). The core differentiator is "Accessibility First," ensuring complete compatibility with screen readers (NVDA, VoiceOver) and high-contrast/keyboard-only navigation standards (WCAG 2.1 AAA).

## 2. Technical Stack (Required)

- **Frontend:** Next.js 14+ (App Router) for SEO and Server-Side Rendering (crucial for screen readers).
- **Styling:** Tailwind CSS (with `aria-*` modifiers) + Radix UI (headless accessible components).
- **Backend:** Node.js (Express or NestJS).
- **Database:** MongoDB (via Mongoose) for flexible schemas (User Profiles, Course Content).
- **Caching:** Redis (for session management and caching course content).
- **Authentication:** NextAuth.js (Custom provider + Google/LinkedIn Social Login).
- **Payment:** Stripe or Paymob (Egyptian Gateway) Integration.
- **File Storage:** AWS S3 or Cloudinary (for CVs and Course Videos).

## 3. User Roles & Detailed User Stories

### 3.1. [cite_start]Normal Users (The Candidates/Learners)

- **Registration/Login:** Must support voice commands or simplified, high-contrast inputs.
- **Dashboard:** A personalized hub showing "Applications Status," "Enrolled Courses," and "Recommended Jobs."
- **Job Seeking:**
  - Search and filter jobs (fully keyboard accessible).
  - "Easy Apply" feature similar to LinkedIn.
  - Upload/Builder for CVs (The system should parse PDFs to ensure they are screen-reader friendly).
- **LMS (Learning):**
  - Browse course catalog.
  - Purchase courses (Cart & Checkout).
  - **Video Player:** Custom accessible player (support for Audio Description tracks, Keyboard shortcuts for pause/play/speed).
  - Track progress (e.g., "You have completed 40% of Python Course").

### 3.2. [cite_start]Company (The Employers)

- **Onboarding:** Register as a company -> Status becomes "Pending" until Admin approval.
- **Company Profile:** Logo, Description, Location, Accessibility Score (how friendly their office is).
- **Job Posting:** Create job posts with specific fields for accessibility requirements.
- **ATS (Applicant Tracking System):** View applicants, filter them, status updates (Viewed, Shortlisted, Rejected).

### 3.3. [cite_start]Trainers (The Instructors)

- **Course Management:** Create courses, arrange modules/chapters.
- **Content Upload:** Upload videos, add transcripts (Required for accessibility), and lecture notes.
- **Student Interaction:** View Q&A from students.

### 3.4. [cite_start]Admin (Super User) [cite: 2]

- **Analytics Dashboard:** Total Users, Revenue, Active Jobs, Top Companies.
- **Approvals Queue:**
  - List of pending Company profiles (Approve/Reject button).
  - List of flagged content.
- **User Management:** Ability to ban/suspend users or reset passwords.
- **Content Control:** Ability to remove courses or modify job posts if they violate terms.
- **Manual Entry:** Ability to manually create Admin accounts or specific high-profile users.

## 4. Accessibility & UI/UX Requirements (Critical)

- **Semantic HTML:** Strict use of `<main>`, `<nav>`, `<article>`, `<button>` (no `div` as button).
- **ARIA Labels:** All interactive elements must have `aria-label` or `aria-labelledby`.
- **Focus Management:** Visible focus rings for keyboard navigation.
- **Skip Links:** "Skip to content" link at the top of every page.
- **Alt Text:** Enforced `alt` text for all uploaded images.

## 5. Data Models (Schema Concepts)

### User Schema

- `_id`, `name`, `email`, `role` (enum: user, admin, company, trainer), `accessibilitySettings` (font-size, contrast-preference).

### Job Schema

- `title`, `companyId` (ref), `description`, `requirements`, `accessibilityFeatures`, `applicants` (Array of refs).

### Course Schema

- `title`, `trainerId` (ref), `price`, `modules` (Array), `transcripts` (String), `isPublished`.

## 6. Security & Performance

- **Rate Limiting:** Protect APIs against abuse.
- **Input Validation:** Zod schema validation for all forms.
- **RBAC (Role-Based Access Control):** Middleware to ensure Students cannot access Admin routes.

## 7. Advanced Technical Specifications & Workflows (CRITICAL)

### 7.1. Notification Infrastructure

- **Requirement:** System must support multi-channel notifications (In-App + Email).
- **Triggers:**
  - **User:** "Application Viewed", "New Job Alert matching profile".
  - **Company:** "New Applicant", "Profile Approved".
  - **Admin:** "New Company Registration".
- **Tech Stack:** Use **Resend** or **SendGrid** for transactional emails. Create a `Notification` model in DB for in-app history.

### 7.2. Search Engine Implementation

- **Do Not Use:** Simple Regex or `.find()` for searching jobs/courses.
- **Requirement:** Implement **MongoDB Atlas Search** to enable:
  - **Fuzzy Matching:** Allow typos (e.g., searching "phyton" finds "python").
  - **Faceted Search:** Filter by Salary, Location, and Accessibility Rating simultaneously.
  - **Ranking:** Prioritize "Newest" and "Most Relevant".

### 7.3. Egyptian Payment Integration (Paymob)

- **Primary Gateway:** Paymob (Accept).
- **Currency:** EGP (Egyptian Pound).
- **Required Payment Methods:**
  - Credit/Debit Cards (Visa/Mastercard/Meeza).
  - Mobile Wallets (Vodafone Cash, Orange Cash, etc.).
- **Payment Flow:**
  1. **Initiate:** Backend authenticates with Paymob API -> Gets Access Token.
  2. **Order Registration:** Backend creates an Order ID.
  3. **Payment Key:** Backend requests a Payment Key for the specific amount.
  4. **Redirect:** Frontend redirects user to Paymob's `iframe` or handles Wallet number input.
  5. **Webhook Handling (Crucial):**
     - The system must expose a `POST /api/webhooks/paymob` endpoint.
     - Verify the HMAC signature (security check) to ensure the request is genuinely from Paymob.
     - Update Order status in DB to "Paid" and unlock the Course strictly after Webhook verification.

### 7.4. Video & File Handling (Performance)

- **CV Parsing:** Use a library like `pdf-parse` to extract text from CVs automatically for screen readers.
- **Video Streaming:**
  - When Trainer uploads a video, use Cloudinary/Mux to auto-transcode it into adaptive bitrate streams (HLS).
  - **Player:** Must support keyboard shortcuts (Space=Play, Arrows=Seek) and remember playback position (`lastWatchedTimestamp`).

### 7.5. Automated Testing Strategy

- **Requirement:** The AI must generate tests for critical flows.
- **Unit Tests:** Jest for utility functions (e.g., salary calculators).
- **E2E Tests:** Playwright for critical paths: "User Sign up -> Search Job -> Apply" (Ensure all elements are reachable via keyboard during tests).
