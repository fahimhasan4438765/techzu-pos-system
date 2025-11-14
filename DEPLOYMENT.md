# Vercel Deployment Guide for TechzuPOS

This monorepo contains three applications:
- **API**: Express.js backend (`/api`)
- **Web**: Next.js admin panel (`/web`) 
- **POS**: React Native mobile app (`/pos`) - Not deployed to Vercel

## Deployment Setup

### 1. API Deployment (Already Configured)

The API is deployed using the configuration in `api/vercel.json`.

**Vercel Dashboard Settings:**
- **Root Directory**: Leave empty (deploys from root)
- **Framework**: Other
- **Build Command**: `cd api && npx prisma generate`
- **Install Command**: `cd api && npm install`

### 2. Web App Deployment (Next.js Admin Panel)

**Option A: Create Separate Vercel Project (Recommended)**

1. Create a new Vercel project
2. Connect to the same GitHub repository
3. Set **Root Directory** to `web`
4. Framework will auto-detect as Next.js
5. Deploy

**Option B: Manual Configuration**

Use the `web/vercel.json` configuration with Root Directory set to `web`.

**Vercel Dashboard Settings for Web:**
- **Root Directory**: `web`
- **Framework**: Next.js
- **Build Command**: `npm run build` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

## Environment Variables

Make sure to set these in your Vercel project settings:

### API Project
- `DATABASE_URL`: Your PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT tokens
- `CORS_ORIGIN`: Allowed origins for CORS (comma-separated)

### Web Project  
- `NEXT_PUBLIC_API_URL`: Your API base URL (e.g., https://your-api.vercel.app)

## File Structure

```
├── api/                    # Express API (Deploy as separate project)
│   ├── vercel.json        # API deployment config
├── web/                   # Next.js Admin (Deploy as separate project)
│   ├── vercel.json        # Web deployment config
├── pos/                   # React Native (Not deployed)
├── vercel-api.json        # Backup API config (not used)
└── .vercelignore         # Ignore pos/ and web/ for API deployment
```

## Troubleshooting

### "No Next.js version detected" Error
- Make sure **Root Directory** is set to `web` in Vercel dashboard
- Verify `next` is in dependencies in `web/package.json`
- Try deploying web as a separate Vercel project

### API Prisma Issues
- Ensure `DATABASE_URL` environment variable is set
- Check that Prisma generates during build process
- Verify PostgreSQL database is accessible from Vercel

## Deployment URLs

After successful deployment, you'll have:
- **API**: `https://your-api-project.vercel.app`
- **Web Admin**: `https://your-web-project.vercel.app`

Make sure to update `NEXT_PUBLIC_API_URL` in the web project to point to your API URL.