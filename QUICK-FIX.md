# Quick Fix - Data Not Saving to Database

## Problem
You create customers/products in the UI but they don't appear in your Supabase database.

## Solution (5 Steps)

### Step 1: Start Your Frontend
```bash
cd frontend
npm run dev
```

### Step 2: Open and Login
- Go to http://localhost:5173
- Log in with your credentials

### Step 3: Click Debug Button
- Look for "🔍 Debug DB" button in the **top-right corner**
- Click it
- Press **F12** to open browser console
- Read the diagnostic output

### Step 4: Copy Error Message
You'll likely see this error:
```
❌ INSERT FAILED: new row violates row-level security policy
🔒 This appears to be a Row Level Security (RLS) policy issue!
```

### Step 5: Fix RLS Policies
1. Open **Supabase Dashboard** (https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**
5. Copy ALL content from `supabase-rls-policies.sql` file
6. Paste it into the SQL editor
7. Click **Run** (or press Ctrl+Enter)

## Done! Now Test

1. Go back to http://localhost:5173
2. Click **Customers** → **Add customer**
3. Fill in: Name = "Test Customer", Mobile = "1234567890"
4. Click **Save customer**
5. Go to **Supabase Dashboard** → **Table Editor** → **customers**
6. Your new customer should be there! ✅

## What Changed?

**Before:** Errors failed silently - you never knew inserts were failing

**After:** You now see:
- ✅ Error messages in toast notifications (top-right)
- ✅ Detailed errors in browser console (F12)
- ✅ Diagnostic tool to test database access
- ✅ Console logs showing success/failure

## Still Not Working?

Try creating a customer again and check browser console (F12). Share the error message you see!

Common issues:
- **"NOT AUTHENTICATED"** → Log out and back in
- **"permission denied"** → Run the SQL script again
- **"column does not exist"** → Run `cd backend && npx prisma db push`

## Files You Need
- `supabase-rls-policies.sql` - Run this in Supabase SQL Editor
- `TROUBLESHOOTING.md` - Detailed troubleshooting guide
- `DATABASE-FIX-SUMMARY.md` - Complete explanation of changes
