# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Ensure your code is pushed to GitHub
3. **Environment Variables**: Prepare all required environment variables

## Required Environment Variables

Set these in your Vercel project dashboard under Settings > Environment Variables:

### Authentication
```
JWT_SECRET=your_secure_jwt_secret_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### Database
```
MONGODB_URI=your_mongodb_connection_string
```

### Email Service
```
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
```

### Google OAuth (Optional)
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### AI Services
```
OPENAI_API_KEY=your_openai_api_key_here
```

### Node Environment
```
NODE_ENV=production
```

## Deployment Steps

### 1. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository: `Text-to-BPMN-Process-and-Decision-Engine`

### 2. Configure Project Settings
- **Framework Preset**: Next.js
- **Root Directory**: `./` (default)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 3. Environment Variables
Add all environment variables listed above in the Vercel dashboard.

### 4. Deploy
Click "Deploy" and wait for the build to complete.

## Post-Deployment Configuration

### 1. Domain Configuration
- Vercel provides a default domain (e.g., `your-app.vercel.app`)
- You can add custom domains in the project settings

### 2. Database Setup
- Ensure your MongoDB Atlas cluster allows connections from Vercel's IP ranges
- Update your MongoDB connection string if needed

### 3. Google OAuth Setup
- Update your Google OAuth redirect URIs to include your Vercel domain
- Add `https://your-app.vercel.app/api/auth/google/callback` to authorized redirect URIs

### 4. Email Service
- Ensure your email service (Gmail) allows SMTP connections from Vercel
- Consider using a dedicated email service for production

## Performance Optimizations

The project is configured with:
- ✅ Standalone output for better performance
- ✅ External packages optimization for MongoDB
- ✅ Compression enabled
- ✅ Security headers optimized
- ✅ Image optimization configured

## Monitoring

- **Vercel Analytics**: Enable in project settings
- **Function Logs**: Monitor API routes in Vercel dashboard
- **Database Monitoring**: Use MongoDB Atlas monitoring

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check environment variables are set correctly
   - Verify all dependencies are in package.json
   - Check build logs in Vercel dashboard

2. **Platform Compatibility Issues**
   - **Error**: `Unsupported platform for @next/swc-win32-x64-msvc`
   - **Solution**: Remove Windows-specific packages from devDependencies
   - The project includes `.npmrc` and `vercel.json` configurations to handle this

3. **Vercel Configuration Conflicts**
   - **Error**: `The functions property cannot be used in conjunction with the builds property`
   - **Solution**: Remove the `builds` property from `vercel.json` when using `functions`
   - Modern Vercel deployments use `framework: "nextjs"` instead of explicit builds

2. **Database Connection Issues**
   - Verify MONGODB_URI is correct
   - Check MongoDB Atlas network access settings
   - Ensure database user has proper permissions

3. **Authentication Issues**
   - Verify JWT_SECRET is set and secure
   - Check Google OAuth configuration
   - Ensure redirect URIs match your domain

4. **Email Service Issues**
   - Verify email credentials
   - Check if 2FA is enabled (use app-specific password)
   - Test SMTP connection

### Support
- Check Vercel documentation: [vercel.com/docs](https://vercel.com/docs)
- Next.js deployment guide: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- MongoDB Atlas setup: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)

## Security Checklist

- [ ] All environment variables are set and secure
- [ ] JWT_SECRET is a strong, random string
- [ ] MongoDB connection uses authentication
- [ ] Google OAuth redirect URIs are properly configured
- [ ] Email service uses app-specific passwords
- [ ] API routes have proper error handling
- [ ] CORS is configured correctly
