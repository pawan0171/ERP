# Database Not Saving Data - Troubleshooting Guide

## Problem
Data appears in the website UI but is NOT being saved to the Supabase database.

## What Was Fixed

### 1. Added Error Handling
Previously, all database operations were missing error handling. Errors were failing **silently** - the code would execute but never check if the operation succeeded.

**Changed in:**
- `frontend/src/Customers.tsx` - Customer save function
- `frontend/src/Inventory.tsx` - Product save and stock adjustment functions  
- `frontend/src/Challans.tsx` - Challan creation function

**What changed:**
```typescript
// BEFORE (no error checking):
await supabase.from('customers').insert(form);

// AFTER (proper error handling):
const result = await supabase.from('customers').insert(form);
if (result.error) {
  console.error('Supabase error:', result.error);
  setToast(`Error: ${result.error.message}`);
  return;
}
```

### 2. Added Diagnostic Tool
Created a debug button in the UI that tests:
- Authentication status
- User profile access
- Insert permissions
- Read permissions
- Row Level Security (RLS) policies

**How to use:**
1. Open the app at http://localhost:5173
2. Log in
3. Click the "🔍 Debug DB" button in the top right
4. Open browser DevTools console (F12)
5. Review the diagnostic output

## Most Likely Causes

### Cause 1: Row Level Security (RLS) Policies Not Set
**Symptom:** Insert fails with permission/policy error

Supabase tables have RLS enabled by default. You need policies to allow inserts.

**Solution:**
Go to Supabase Dashboard → Authentication → Policies → Add policies for each table:

```sql
-- Allow authenticated users to insert customers
CREATE POLICY "Users can insert customers"
ON customers FOR INSERT
TO authenticated
USING (true);

-- Allow authenticated users to update their own data
CREATE POLICY "Users can update customers"
ON customers FOR UPDATE
TO authenticated
USING (true);

-- Allow authenticated users to read customers
CREATE POLICY "Users can read customers"
ON customers FOR SELECT
TO authenticated
USING (true);
```

Do the same for: `products`, `challans`, `challan_items`, `stock_movements`

### Cause 2: User Not Authenticated
**Symptom:** Diagnostic shows "NOT AUTHENTICATED"

**Solution:**
- Make sure you're logged in
- Check if session token is valid
- Try logging out and back in

### Cause 3: Missing Database Columns
**Symptom:** Error mentions unknown column names

**Solution:**
Check that your database schema matches the code. Run:
```bash
cd backend
npx prisma db push
```

## How to Diagnose

### Step 1: Check Browser Console
1. Open http://localhost:5173
2. Press F12 to open DevTools
3. Go to Console tab
4. Try creating a customer/product
5. Look for error messages (red text)

### Step 2: Run Diagnostic
1. Click "🔍 Debug DB" button
2. Check console output
3. Look for:
   - ❌ (red X) = failed test
   - ✅ (green check) = passed test

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Try creating a customer
3. Find the request to Supabase
4. Check the response - look for error codes

### Step 4: Check Supabase Logs
1. Go to Supabase Dashboard
2. Click "Logs" in left sidebar
3. Look for recent errors

## Testing the Fix

### Test 1: Create a Customer
1. Go to Customers page
2. Click "Add customer"
3. Fill in name: "Test Customer"
4. Click "Save customer"
5. **Check browser console** for errors
6. **Go to Supabase Dashboard** → Table Editor → customers
7. Verify the customer appears in the database

### Test 2: Create a Product
1. Go to Inventory page
2. Click "Add product"
3. Fill in required fields
4. Click "Save product"
5. Check console and database

### Test 3: Run Full Diagnostic
1. Click "🔍 Debug DB"
2. All checks should pass (green ✅)

## Common Error Messages

### "new row violates row-level security policy"
**Cause:** RLS policy not allowing inserts  
**Solution:** Add INSERT policy for authenticated users (see above)

### "permission denied for table customers"
**Cause:** No RLS policies exist  
**Solution:** Create policies or disable RLS (not recommended)

### "column does not exist"
**Cause:** Schema mismatch  
**Solution:** Run `npx prisma db push` to sync schema

### "NOT AUTHENTICATED"
**Cause:** User not logged in or session expired  
**Solution:** Log out and log back in

## Next Steps

1. **Run the diagnostic** - Click debug button, check console
2. **Try creating data** - Watch for error messages in toast notifications
3. **Check console** - Errors now appear in browser console
4. **Fix RLS policies** - Most likely issue is missing policies
5. **Verify in database** - Always check Supabase dashboard after creating data

## Files Modified
- `frontend/src/Customers.tsx` - Added error handling
- `frontend/src/Inventory.tsx` - Added error handling  
- `frontend/src/Challans.tsx` - Added error handling
- `frontend/src/debug-supabase.ts` - New diagnostic tool
- `frontend/src/App.tsx` - Added debug button

## Need Help?
If errors persist after following this guide:
1. Share the browser console output
2. Share the diagnostic output  
3. Share any error messages from Supabase logs
