# Utility Functions

This directory contains shared utility functions used across the InnoAccess platform.

## Files

- **`env.ts`** - Environment variable validation and type-safe access using Zod
- **`db.ts`** - MongoDB connection management with caching for serverless environments
- **`paymob.ts`** - Paymob payment gateway integration (authentication, orders, payment keys, HMAC verification)

## Usage

```typescript
// Environment variables
import { env } from '@/lib/env';
console.log(env.MONGODB_URI);

// Database connection
import { connectDB } from '@/lib/db';
await connectDB();

// Payment processing
import { initiateCardPayment } from '@/lib/paymob';
const iframeUrl = await initiateCardPayment(10000, 'order-123', billingData);
```
