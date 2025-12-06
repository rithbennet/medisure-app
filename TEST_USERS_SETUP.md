# Test Users Setup Guide

This guide explains how to set up test credentials for all user roles in both WorkOS and Convex.

## Test Credentials

Based on the screenshot requirements, the following test credentials should be available:

| Role              | Email                    | Password |
|-------------------|--------------------------|----------|
| Coordinator       | coordinator@test.com      | test123  |
| Doctor            | doctor@test.com          | test123  |
| Insurance Agent   | agent@test.com           | test123  |
| Patient           | Any new email/IC number  | (via signup) |

**Note:** New signups via WorkOS will automatically get the "patient" role by default.

---

## Setting Up Test Users in Convex

The Convex database already has a seed function to create test users. Run it using the Convex dashboard or CLI:

### Option 1: Using Convex Dashboard
1. Go to your Convex dashboard
2. Navigate to Functions
3. Find `seed:seedTestUsers`
4. Click "Run" to execute the mutation

### Option 2: Using Convex CLI
```bash
npx convex run seed:seedTestUsers
```

This will create the three test users (Coordinator, Doctor, Insurance Agent) in your Convex database.

---

## Setting Up Test Users in WorkOS

You need to create test users in WorkOS so they can authenticate. Follow these steps:

1. **Log in to WorkOS Dashboard**
   - Go to https://dashboard.workos.com
   - Navigate to your organization

2. **Create Test Users**
   - Go to **Users** section
   - Click **Create User** for each test user:
   
   **Coordinator:**
   - Email: `coordinator@test.com`
   - Password: `test123`
   - First Name: `Admin`
   - Last Name: `Coordinator`
   - Mark email as verified ✅
   
   **Doctor:**
   - Email: `doctor@test.com`
   - Password: `test123`
   - First Name: `Dr. Test`
   - Last Name: `Doctor`
   - Mark email as verified ✅
   
   **Insurance Agent:**
   - Email: `agent@test.com`
   - Password: `test123`
   - First Name: `Insurance`
   - Last Name: `Agent`
   - Mark email as verified ✅

3. **Add Users to Organization**
   - For each user, add them to your organization
   - Go to **Organizations** → Select your org → **Members**
   - Add each test user as a member

---

## How Authentication Works

### Signup Flow (New Users)
1. User signs up via WorkOS AuthKit
2. WorkOS creates the user account
3. After authentication, the app calls `getOrCreateWorkosUser` mutation
4. Convex creates/updates the user record with:
   - Default role: **"patient"**
   - `profileComplete`: **false** (until IC number is added)
   - WorkOS ID linked to the user

### Login Flow (Existing Users)
1. User logs in via WorkOS AuthKit
2. WorkOS authenticates the user
3. App calls `getOrCreateWorkosUser` to sync with Convex
4. If user exists in Convex, their role and data are preserved
5. If user doesn't exist, they're created with "patient" role

### Role Assignment
- **New signups**: Automatically assigned "patient" role
- **Existing test users**: Roles are set in Convex seed data
- **Role updates**: Can be done via Convex admin functions (coordinator role required)

---

## Verifying Setup

### Test Login
1. Go to your app's sign-in page
2. Use any of the test credentials:
   - `coordinator@test.com` / `test123`
   - `doctor@test.com` / `test123`
   - `agent@test.com` / `test123`

### Test Signup
1. Go to your app's sign-up page
2. Use a new email address (e.g., `newpatient@test.com`)
3. Complete the signup process
4. Verify in Convex that:
   - User was created with role "patient"
   - `profileComplete` is `false`
   - WorkOS ID is linked

---

## Troubleshooting

### Users can't log in
- Verify users exist in WorkOS dashboard
- Check that users are added to your organization
- Ensure email is marked as verified in WorkOS

### Users created but wrong role
- Check Convex database - roles are stored there, not in WorkOS
- Run the seed function again if needed
- Verify `getOrCreateWorkosUser` is setting default role to "patient"

### Session issues
- WorkOS handles authentication sessions
- Convex tracks user data and roles
- Check browser console for any sync errors

---

## Next Steps

After setting up test users:
1. ✅ Test login with each role
2. ✅ Test signup with a new email (should get patient role)
3. ✅ Verify roles display correctly in dashboard
4. ✅ Test role-based features if implemented

