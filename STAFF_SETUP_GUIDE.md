# Staff Account Setup Guide

## Problem
Staff credentials saved by admin are not persisting for subsequent logins.

## Root Cause
The `staff_accounts` table must exist in your Supabase database for credentials to be stored.

## Solution

### Step 1: Ensure Table Exists in Supabase

Run the following SQL in your Supabase SQL Editor (https://supabase.com/dashboard):

```sql
-- Create staff_accounts table for persistent staff credentials
CREATE TABLE IF NOT EXISTS public.staff_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE TRIGGER staff_accounts_updated_at
  BEFORE UPDATE ON public.staff_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

**Steps to run:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the SQL above
6. Click **Run**

### Step 2: Create Staff Credentials (Admin Only)

1. Go to **Admin Dashboard** → **Settings**
2. Scroll to **Staff Account Management**
3. Fill in:
   - **Staff Name**: e.g., "Ahmed Khan"
   - **Email Address**: e.g., "staff@fattypatty.com"
   - **Password**: Min 8 characters (e.g., "SecurePass123")
   - **Confirm Password**: Re-enter the password
   - **Account Status**: Choose "Active"
4. Click **Save Staff Account**
5. Wait for green success message

### Step 3: Verify Credentials Work

1. **Log out** of admin account
2. Go to **Admin Login** page (`/admin/login`)
3. Click **👤 Staff** tab (bottom left)
4. Enter:
   - Email: (the one from Step 2)
   - Password: (the one from Step 2)
5. Click **Login**
6. You should see **Staff Dashboard** with orders and support sections

### Step 4: Reuse Credentials Anytime

Once saved, any staff member can:
1. Go to `/admin/login`
2. Select **Staff** tab
3. Enter the saved email and password
4. Access staff dashboard indefinitely

**Note**: The same credentials work for all staff members accessing from different devices/browsers.

## Troubleshooting

### "Invalid staff credentials" when logging in as staff
- **Verify:** Admin has saved credentials in Settings → Staff Account Management
- **Check:** Email and password match exactly (case-sensitive)
- **Ensure:** Staff account is marked as "Active"

### "Staff account system not set up"
- **Run the SQL** in Step 1 to create the table
- Refresh the page and try again

### "Failed to save staff account"
- **Check:** All fields are filled (name, email, password)
- **Password:** Must be at least 8 characters
- **Email:** Must be unique (no other staff account with same email)
- **Check Supabase:** Ensure table was created successfully (see Step 1)

## How It Works

1. **Admin saves credentials** → Hashed and stored in `staff_accounts` table
2. **Staff logs in** → Password verified against stored hash
3. **Credentials persist** → Always available in database for future logins
4. **Multiple logins** → Same credentials work from any device, anytime

## Security Notes

- Passwords are hashed with salt using scrypt (not stored in plain text)
- Each password verification is timing-safe to prevent timing attacks
- Staff accounts can be deactivated without deleting data
