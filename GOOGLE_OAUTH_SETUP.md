# Google OAuth Setup Guide for Vercel Deployment

## Issue
Google Sign-In fails because the OAuth redirect URI is set to `localhost` by default.

## Solution: 3 Steps to Fix

### Step 1: Get Your Vercel Deployment URL
Your deployment URL should be something like:
- `https://your-app-name.vercel.app`
- Or your custom domain if configured

### Step 2: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create one)
3. Go to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID (or create one)
5. Under **Authorized redirect URIs**, add:
   ```
   https://your-actual-vercel-domain.vercel.app/api/auth/google/callback
   ```
   Example:
   ```
   https://text-to-bpmn.vercel.app/api/auth/google/callback
   ```
6. Click **Save**

### Step 3: Set Environment Variables in Vercel

1. Go to your Vercel Dashboard
2. Select your project
3. Go to **Settings** > **Environment Variables**
4. Add these variables for **Production**, **Preview**, and **Development**:

   | Variable Name | Value |
   |---------------|-------|
   | `GOOGLE_CLIENT_ID` | Your Google Client ID |
   | `GOOGLE_CLIENT_SECRET` | Your Google Client Secret |
   | `REDIRECT_URI` | `https://your-vercel-domain.vercel.app/api/auth/google/callback` |
   | `NEXT_PUBLIC_APP_URL` | `https://your-vercel-domain.vercel.app` |
   | `JWT_SECRET` | Your JWT secret key |
   | `MONGODB_URI` | Your MongoDB connection string |
   | `EMAIL_USER` | Your email for OTP |
   | `EMAIL_PASSWORD` | Your Gmail app password |
   | `OPENAI_API_KEY` | Your OpenAI API key (if using AI features) |

5. Click **Save**
6. Redeploy your application (or it will auto-redeploy after saving)

## Testing

1. After redeploying, go to your production URL
2. Click "Sign in with Google"
3. You should be redirected to Google's login page
4. After signing in, you'll be redirected back to your app

## Troubleshooting

### Error: `redirect_uri_mismatch`
- The redirect URI in Google Cloud Console doesn't match the one in your Vercel env vars
- Make sure both use the exact same URL (including https://)

### Error: `token_exchange_failed`
- Your `GOOGLE_CLIENT_SECRET` might be incorrect in Vercel
- Verify it matches the one in Google Cloud Console

### Error: `callback_error`
- Check your Vercel function logs for the detailed error message
- Usually a MongoDB connection or JWT secret issue

## For Multiple Environments

If you want different URLs for preview and production:

**Production Environment Variables:**
- `REDIRECT_URI` = `https://your-production-domain.com/api/auth/google/callback`

**Preview Environment Variables:**
- `REDIRECT_URI` = `https://your-preview-domain.vercel.app/api/auth/google/callback`

**Development (Local):**
- `REDIRECT_URI` = `http://localhost:3000/api/auth/google/callback`

Then add ALL these URLs to Google Cloud Console's authorized redirect URIs.
