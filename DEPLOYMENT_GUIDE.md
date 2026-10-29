# Deployment Guide — Splitwise 2.0

## Pre-Deployment Checklist

Before deploying to production, ensure you have:

- [ ] Neon PostgreSQL database created and connection string ready
- [ ] Google Gemini API key (free at https://ai.google.dev)
- [ ] GitHub repository with all code pushed
- [ ] Vercel account (free tier)
- [ ] Render account (free tier)

---

## Testing Production Build Locally

### Backend Production Build Test

```bash
cd backend

# Install dependencies and generate Prisma client
npm install

# Build TypeScript to JavaScript
npm run build

# Verify dist/ folder was created
ls dist/

# Set production environment variables temporarily
# (Windows PowerShell)
$env:NODE_ENV="production"
$env:DATABASE_URL="your-neon-connection-string"
$env:JWT_SECRET="your-jwt-secret-min-32-chars"
$env:GEMINI_API_KEY="your-gemini-api-key"
$env:FRONTEND_URL="http://localhost:5173"
$env:PORT="5000"

# Start production server
npm start

# Test: curl http://localhost:5000/api/auth/me
# Should return 401 Unauthorized (expected without token)
```

### Frontend Production Build Test

```bash
cd frontend

# Create .env.production if it doesn't exist
echo "VITE_API_BASE_URL=http://localhost:5000/api" > .env.production

# Build for production
npm run build

# Verify dist/ folder was created
ls dist/

# Preview production build
npm run preview

# Open http://localhost:4173 in browser
# Test login, create group, add expense
```

---

## Database Migration for Production

After deploying backend to Render, run migrations:

### Option 1: Via Render Shell (Recommended)
1. Go to Render dashboard → Your service → Shell tab
2. Run:
   ```bash
   npx prisma migrate deploy
   ```

### Option 2: From Local Machine
```bash
cd backend

# Set production DATABASE_URL
$env:DATABASE_URL="your-neon-production-url"

# Deploy migrations
npx prisma migrate deploy

# Optionally seed production database
npx prisma db seed
```

---

## Render Deployment

### Step 1: Create New Web Service
1. Log into Render dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Render auto-detects `render.yaml`

### Step 2: Set Environment Variables

Go to service settings → Environment → Add Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | From Neon dashboard → Connection Details → Connection String |
| `JWT_SECRET` | `your-random-secret-min-32-chars` | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `30d` | Already set in render.yaml |
| `GEMINI_API_KEY` | `AIzaSy...` | From https://ai.google.dev → Get API Key |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Update after Vercel deployment |
| `NODE_ENV` | `production` | Already set in render.yaml |
| `PORT` | `10000` | Already set in render.yaml |

### Step 3: Deploy
- Click "Create Web Service"
- Wait 5-10 minutes for first deploy
- Note your backend URL: `https://splitwise-backend.onrender.com`

### Step 4: Update FRONTEND_URL
After Vercel deployment, come back and update `FRONTEND_URL` to your actual Vercel URL.

---

## Vercel Deployment

### Step 1: Import Project
1. Log into Vercel dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository

### Step 2: Configure Build Settings
- **Framework Preset**: Vite
- **Root Directory**: `frontend/`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Step 3: Set Environment Variables

Add in project settings → Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_API_BASE_URL` | `https://splitwise-backend.onrender.com/api` | Your actual Render backend URL |

### Step 4: Deploy
- Click "Deploy"
- Wait 2-5 minutes
- Note your frontend URL: `https://your-app.vercel.app`

### Step 5: Update Backend CORS
Go back to Render → Environment → Update `FRONTEND_URL` to your Vercel URL.

---

## Post-Deployment Verification

### Backend Health Check
```bash
# Test backend is running
curl https://splitwise-backend.onrender.com/api/auth/me

# Expected: {"success":false,"error":{"code":"UNAUTHORIZED",...}}
```

### Frontend Smoke Test
1. Open your Vercel URL
2. Register a new account
3. Create a group
4. Add a member
5. Add an expense
6. View balances
7. Test UPI pay button (won't complete payment, just opens UPI app)
8. Test AI expense parsing (type a sentence)
9. Test bill scanner (upload a receipt image)

---

## Environment Variables Quick Reference

### Render (Backend)
```env
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
JWT_SECRET=<generate-random-32-char-string>
JWT_EXPIRES_IN=30d
GEMINI_API_KEY=AIzaSy...
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
PORT=10000
```

### Vercel (Frontend)
```env
VITE_API_BASE_URL=https://splitwise-backend.onrender.com/api
```

---

## Troubleshooting

### Backend won't start
- **Check Render logs**: Service → Logs tab
- **Common issue**: Missing `postinstall` script in package.json
- **Fix**: Verify `"postinstall": "prisma generate"` exists in backend/package.json

### CORS errors in frontend
- **Check**: `FRONTEND_URL` in Render matches your Vercel URL exactly (including https://)
- **Check**: Backend CORS config includes `/\.vercel\.app$/` regex
- **Check**: Browser console for exact origin being blocked

### Prisma client not generated
- **Check**: Render logs show "prisma generate" ran during build
- **Fix**: Ensure `postinstall` script exists and Render build command includes `npm install`

### 500 errors on API requests
- **Check**: DATABASE_URL is set correctly
- **Check**: Database migrations were deployed
- **Check**: Render logs show specific error

### Vercel build fails
- **Check**: Root directory is set to `frontend/`
- **Check**: frontend/package.json has `"build": "vite build"` script
- **Check**: VITE_API_BASE_URL is set in environment variables

---

## Updating After Deployment

### Code Changes
```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push origin main

# Both Vercel and Render auto-deploy on push
```

### Database Schema Changes
```bash
# Create migration locally
cd backend
npx prisma migrate dev --name your_migration_name

# Push to GitHub
git add prisma/migrations
git commit -m "Add migration: your_migration_name"
git push

# After Render deploys, run in Render Shell:
npx prisma migrate deploy
```

---

## Cost Breakdown

- **Neon PostgreSQL**: Free tier (0.5 GB storage, 1 branch)
- **Render Backend**: Free tier (750 hours/month, sleeps after 15 min)
- **Vercel Frontend**: Free tier (100 GB bandwidth, unlimited deployments)
- **Google Gemini**: Free tier (60 requests/min)

**Total monthly cost: $0** (within free tier limits)

---

## Production Optimizations (Future)

- Enable Redis caching for balance calculations
- Add CloudFront/CDN for frontend assets
- Upgrade Render to paid tier to eliminate cold starts
- Implement Razorpay webhook for automatic UPI settlement confirmation
- Add rate limiting and request throttling
- Set up Sentry for error tracking
- Enable automated backups for Neon database
