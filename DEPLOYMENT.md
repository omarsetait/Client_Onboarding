# TachyHealth Deployment Guide

This guide explains how to deploy the TachyHealth Onboarding System to production.

## Architecture

| Component | Platform | URL Pattern |
|-----------|----------|-------------|
| **Frontend (Web)** | Vercel | `https://your-app.vercel.app` |
| **Backend (API)** | Railway | `https://your-api.up.railway.app` |
| **Database** | Supabase | Managed PostgreSQL |

---

## Prerequisites

1. **GitHub Repository**: Code pushed to GitHub
2. **Supabase Account**: [supabase.com](https://supabase.com) - For PostgreSQL database
3. **Railway Account**: [railway.app](https://railway.app) - For API hosting
4. **Vercel Account**: [vercel.com](https://vercel.com) - For frontend hosting
5. **Resend Account**: [resend.com](https://resend.com) - For email delivery
6. **OpenAI Account**: [platform.openai.com](https://platform.openai.com) - For AI features

---

## Step 1: Set Up Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database**
3. Copy the **Connection String (URI)** - this is your `DATABASE_URL`
4. Make sure **Connection Pooling** is enabled for better performance

---

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your `Client_Onboarding` repository
4. **Important**: Leave **Root Directory** as default (`/`), do NOT set it to `apps/api`.
   - The Dockerfile in the project root handles the monorepo build properly.

### 2.2 Configure Environment Variables

In Railway, go to your project → **Variables** tab and add:

```env
# Database
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres

# Authentication
JWT_SECRET=your-very-long-secret-key-at-least-32-characters
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=another-very-long-secret-key-at-least-32-characters

# Email
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=onboarding@resend.dev

# AI Features
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

# Environment
NODE_ENV=production

# CORS (will be updated after Vercel deployment)
WEB_URL=http://localhost:3000
```

### 2.3 Deploy

Railway will automatically build using the Dockerfile and deploy.

### 2.4 Verify

Once deployed, visit:
- `https://your-api.up.railway.app/api/v1/health`
- Should return: `{ "status": "ok" }`

**Copy your Railway URL** - you'll need it for Step 3.

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New"** → **"Project"**
3. Import your `Client_Onboarding` repository
4. Configure:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.2 Add Environment Variable

In Vercel project settings → **Environment Variables**:

```env
VITE_API_URL=https://your-api.up.railway.app/api/v1
```

Replace `your-api.up.railway.app` with your actual Railway URL from Step 2.

### 3.3 Deploy

Click **Deploy** and wait for the build to complete.

---

## Step 4: Update Railway CORS

Now that you have your Vercel URL, update Railway:

1. Go to Railway → Your Project → **Variables**
2. Update `WEB_URL` to your Vercel URL:
   ```
   WEB_URL=https://your-app.vercel.app
   ```
3. Railway will automatically redeploy

---

## Step 5: Run Database Migrations

If this is a fresh database, run migrations:

```bash
# Locally, with DATABASE_URL set to your Supabase connection
cd packages/database
npx prisma migrate deploy
npx prisma db seed  # Optional: seed with test data
```

Or configure Railway to run migrations on deploy by adding to `railway.json`:
```json
{
  "deploy": {
    "startCommand": "npx prisma migrate deploy && node apps/api/dist/main.js"
  }
}
```

---

## Verification Checklist

- [ ] Railway health check: `/api/v1/health` returns OK
- [ ] Swagger docs accessible: `/api/docs`
- [ ] Vercel frontend loads without errors
- [ ] Login form works (creates session)
- [ ] Dashboard loads data from API
- [ ] Emails are sent (check Resend dashboard)

---

## Troubleshooting

### API returns 500 errors
- Check Railway logs for error details
- Verify `DATABASE_URL` is correct
- Ensure `JWT_SECRET` is set

### Frontend can't connect to API
- Verify `VITE_API_URL` is set correctly in Vercel
- Check that Railway `WEB_URL` includes your Vercel domain for CORS

### Database connection fails
- Ensure Supabase allows connections from Railway IPs
- Try enabling **Connection Pooling** in Supabase

---

## Environment Variables Reference

### Railway (API)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | JWT signing secret (32+ chars) |
| `JWT_EXPIRES_IN` | ❌ | Token expiry (default: 15m) |
| `JWT_REFRESH_SECRET` | ❌ | Refresh token secret |
| `RESEND_API_KEY` | ✅ | Email service API key |
| `EMAIL_FROM` | ❌ | Sender email address |
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `NODE_ENV` | ❌ | Set to `production` |
| `WEB_URL` | ✅ | Vercel frontend URL (for CORS) |

### Vercel (Web)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Railway API URL with `/api/v1` |
