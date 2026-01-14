# Admin Setup Instructions

## Your Admin Account

**Email**: youssefffadel555@gmail.com *(Note: Fixed typo from "gmain" to "gmail")*  
**Password**: YAIa.#@1

## How to Create Your Admin Account

Run this command in your terminal:

```bash
npm run seed:admin
```

This will:
1. Connect to your MongoDB database
2. Check if admin already exists
3. Hash your password securely
4. Create admin account
5. Display success message with admin ID

**Output Example**:
```
🔌 Connecting to database...
✅ Admin user created successfully!
📧 Email: youssefffadel555@gmail.com
👤 Name: Yousef Adel
🔑 Role: admin
🆔 ID: 507f1f77bcf86cd799439011
🎉 You can now sign in with these credentials!
```

## How to Sign In as Admin

1. Go to `/auth/signin`
2. Enter email: `youssefffadel555@gmail.com`
3. Enter password: `YAIa.#@1`
4. Click "Sign In"
5. You'll be redirected to your dashboard
6. Visit `/admin` for admin dashboard

## How to Add More Admins

### Method 1: Using API (Recommended)

Send POST request to `/api/admin/users/create-admin` with:

**Headers**:
```
Content-Type: application/json
Cookie: [your session cookie - automatically included when signed in]
```

**Body**:
```json
{
  "name": "New Admin Name",
  "email": "newadmin@example.com",
  "password": "SecurePassword123"
}
```

**Using Postman or similar**:
1. Sign in to admin account first (to get session)
2. Make POST request to the endpoint above
3. New admin will be created immediately

**Using curl**:
```bash
curl -X POST http://localhost:3000/api/admin/users/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Admin",
    "email": "newadmin@example.com",
    "password": "SecurePass123"
  }'
```

### Method 2: Modify Seed Script

Edit `scripts/seed-admin.ts` and change the credentials, then run again.

---

**Files Created**:
- `scripts/seed-admin.ts` - Admin creation script
- `src/app/api/admin/users/create-admin/route.ts` - API to add admins
- Updated `package.json` with `seed:admin` script
