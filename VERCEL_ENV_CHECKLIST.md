# Vercel Environment Variables Checklist

## ✅ CRITICAL - Must Be Set For Authentication To Work

### 1. Database (REQUIRED)
```
MONGODB_URI = your_mongodb_connection_string
```
**Without this:** Login will fail with "Internal server error"

### 2. JWT Secret (REQUIRED)
```
JWT_SECRET = any_long_random_string_here
```
**Example:** `my-super-secret-jwt-key-change-this-in-production`
**Without this:** Token creation will fail

### 3. Google OAuth (For Google Sign-In)
```
GOOGLE_CLIENT_ID = 26741230842-bapau7n0tqcucli8iuudgjfla5c9lvlo.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET = 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
REDIRECT_URI = https://text-to-bpn-process-and-decision-en.vercel.app/api/auth/google/callback
```

### 4. Application URL (REQUIRED)
```
NEXT_PUBLIC_APP_URL = https://text-to-bpn-process-and-decision-en.vercel.app
```

### 5. Email Service (For OTP - Optional but needed for signup)
```
EMAIL_SERVICE = gmail
EMAIL_USER = your_email@gmail.com
EMAIL_PASSWORD = your_gmail_app_password
```

### 6. OpenAI (For AI features - Optional)
```
OPENAI_API_KEY = sk-proj-...
```

## How To Set in Vercel:

1. Go to: https://vercel.com/dashboard
2. Click your project: **text-to-bpn-process-and-decision-en**
3. Click **Settings** → **Environment Variables**
4. Add each variable above
5. Select **All Environments** (Production, Preview, Development)
6. Click **Save**
7. **IMPORTANT:** After adding all variables, go to **Deployments** → Click "Redeploy"

## Check If Variables Are Set:

In Vercel Dashboard → Settings → Environment Variables, you should see:
- ✅ MONGODB_URI (Sensitive)
- ✅ JWT_SECRET (Sensitive)
- ✅ GOOGLE_CLIENT_ID
- ✅ GOOGLE_CLIENT_SECRET (Sensitive)
- ✅ REDIRECT_URI
- ✅ NEXT_PUBLIC_APP_URL
- ✅ EMAIL_USER
- ✅ EMAIL_PASSWORD (Sensitive)

## Common Issues:

### "Internal server error" on login:
- Missing `MONGODB_URI` or `JWT_SECRET`
- MongoDB connection string is incorrect
- MongoDB Atlas not allowing Vercel IP addresses

### Google Sign-In fails:
- Missing `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, or `REDIRECT_URI`
- Redirect URI not added to Google Cloud Console

### Cannot sign up:
- Missing `EMAIL_USER` or `EMAIL_PASSWORD`
- Gmail 2FA not enabled or app password incorrect
