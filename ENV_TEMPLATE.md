# Splitwise 2.0 — Environment Variables

This document lists all required environment variables for Splitwise 2.0. Create `.env` files based on these templates and **add them to `.gitignore`** to prevent committing secrets to version control.

---

## Backend Environment Variables

**File location**: `backend/.env`

```env
# ============================================================================
# DATABASE
# ============================================================================

# PostgreSQL connection string
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
# Local dev example: postgresql://postgres:password@localhost:5432/splitwise2_dev
# Production (Supabase): Get from Supabase project settings
DATABASE_URL="postgresql://user:password@localhost:5432/splitwise2_dev"


# ============================================================================
# AUTHENTICATION
# ============================================================================

# Secret key for signing JWT tokens
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# IMPORTANT: Use different secrets for dev and production
JWT_SECRET="your-super-secret-jwt-key-min-32-chars-long-change-in-production"

# JWT token expiration duration
# Examples: "1h", "7d", "30d", "90d"
JWT_EXPIRES_IN="7d"


# ============================================================================
# AI SERVICE
# ============================================================================

# Anthropic API key for Claude AI
# Get from: https://console.anthropic.com/
# Required for /api/ai/parse-expense and /api/ai/scan-bill endpoints
ANTHROPIC_API_KEY="sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"


# ============================================================================
# SERVER CONFIGURATION
# ============================================================================

# Port for the Express server
# Default: 5000
PORT=5000

# Environment mode
# Values: "development" | "production" | "test"
NODE_ENV="development"


# ============================================================================
# CORS
# ============================================================================

# Frontend URL for CORS whitelisting
# Local dev: http://localhost:5173 (Vite default port)
# Production: https://splitwise2.example.com
FRONTEND_URL="http://localhost:5173"


# ============================================================================
# OPTIONAL
# ============================================================================

# Rate limiting (requests per minute per IP)
# RATE_LIMIT_MAX=100

# Log level: "error" | "warn" | "info" | "debug"
# LOG_LEVEL="info"

# Sentry DSN for error tracking (production)
# SENTRY_DSN=""
```

---

## Frontend Environment Variables

**File location**: `frontend/.env`

**IMPORTANT**: All frontend environment variables must be prefixed with `VITE_` to be accessible in the Vite build.

```env
# ============================================================================
# API
# ============================================================================

# Backend API base URL
# Local dev: http://localhost:5000/api
# Production: https://api.splitwise2.example.com/api
VITE_API_BASE_URL="http://localhost:5000/api"


# ============================================================================
# OPTIONAL
# ============================================================================

# Enable debug logging in development
# VITE_DEBUG="true"

# Google Analytics ID (production)
# VITE_GA_ID=""

# Sentry DSN for error tracking (production)
# VITE_SENTRY_DSN=""
```

---

## Environment Variable Descriptions

### Backend Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string. For local development, use a local Postgres instance. For production, use Supabase connection string. |
| `JWT_SECRET` | ✅ Yes | Secret key for signing JWT authentication tokens. Must be at least 32 characters. Generate with `crypto.randomBytes(64).toString('hex')` in Node.js. **Use different secrets for dev and production.** |
| `JWT_EXPIRES_IN` | ✅ Yes | Duration before JWT tokens expire. Examples: "1h", "7d", "30d". Recommended: "7d" for development, "30d" for production. |
| `ANTHROPIC_API_KEY` | ✅ Yes | API key for Anthropic Claude. Required for AI features (NLP expense parsing and bill scanning). Get from https://console.anthropic.com/. Starts with `sk-ant-api03-`. |
| `PORT` | ⚠️ Recommended | Port number for the Express server. Default: 5000. Change if port conflicts exist. |
| `NODE_ENV` | ⚠️ Recommended | Environment mode. Values: "development", "production", "test". Affects logging, error verbosity, and CORS. |
| `FRONTEND_URL` | ✅ Yes | Frontend URL for CORS whitelisting. Must match the origin of frontend requests. Local dev: `http://localhost:5173`. Production: your Vercel deployment URL. |

### Frontend Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | ✅ Yes | Base URL for backend API. Must include `/api` path. Local dev: `http://localhost:5000/api`. Production: your Render backend URL + `/api`. |

---

## Setup Instructions

### Local Development

1. **Backend setup**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your local values
   ```

2. **Frontend setup**:
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your local values
   ```

3. **Start PostgreSQL** (if using local instance):
   ```bash
   # macOS (Homebrew)
   brew services start postgresql

   # Linux (systemd)
   sudo systemctl start postgresql

   # Or use Docker
   docker run --name splitwise-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
   ```

4. **Create database**:
   ```bash
   createdb splitwise2_dev
   # Or connect to PostgreSQL and run: CREATE DATABASE splitwise2_dev;
   ```

5. **Run Prisma migrations**:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

6. **Start backend**:
   ```bash
   cd backend
   npm run dev
   ```

7. **Start frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

---

### Production Deployment

#### Backend (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `cd backend && npm install && npx prisma generate`
4. Set start command: `cd backend && npm start`
5. Add environment variables in Render dashboard:
   - `DATABASE_URL` — Get from Supabase
   - `JWT_SECRET` — Generate new secret for production
   - `JWT_EXPIRES_IN` — "30d"
   - `ANTHROPIC_API_KEY` — Your Anthropic API key
   - `NODE_ENV` — "production"
   - `FRONTEND_URL` — Your Vercel frontend URL

#### Database (Supabase)

1. Create a new project on Supabase
2. Go to Settings → Database → Connection String
3. Copy the connection string (starts with `postgresql://`)
4. Use this as `DATABASE_URL` in Render

#### Frontend (Vercel)

1. Create a new project on Vercel
2. Connect your GitHub repository
3. Set root directory: `frontend`
4. Add environment variable:
   - `VITE_API_BASE_URL` — Your Render backend URL + `/api`
5. Deploy

---

## Security Checklist

- ✅ **Never commit `.env` files to Git** — Add `backend/.env` and `frontend/.env` to `.gitignore`
- ✅ **Use different JWT secrets for dev and production** — Generate with `crypto.randomBytes(64).toString('hex')`
- ✅ **Rotate JWT secrets periodically in production** — This will invalidate all existing tokens
- ✅ **Use strong PostgreSQL passwords** — Especially for production databases
- ✅ **Restrict Anthropic API key usage** — Set spending limits in Anthropic console
- ✅ **Use environment-specific keys** — Don't share production keys with development environments
- ✅ **Enable SSL for production database** — Supabase provides SSL by default

---

## .gitignore Reminder

**CRITICAL**: Add these lines to your `.gitignore` files to prevent committing secrets:

### Root `.gitignore`
```
# Environment variables
.env
.env.local
.env.*.local

# Backend
backend/.env
backend/.env.local

# Frontend
frontend/.env
frontend/.env.local
```

### Backend `.gitignore`
```
.env
.env.local
.env.*.local
```

### Frontend `.gitignore`
```
.env
.env.local
.env.*.local
```

---

## Example .env.example Files

Create these files to show developers what variables are needed (without actual secrets):

### `backend/.env.example`
```env
DATABASE_URL="postgresql://user:password@localhost:5432/splitwise2_dev"
JWT_SECRET="your-jwt-secret-here-min-32-chars"
JWT_EXPIRES_IN="7d"
ANTHROPIC_API_KEY="sk-ant-api03-xxxxx"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

### `frontend/.env.example`
```env
VITE_API_BASE_URL="http://localhost:5000/api"
```

---

## Troubleshooting

### "DATABASE_URL is not set"
- Check that `backend/.env` exists and contains `DATABASE_URL`
- Ensure no typos in variable name
- Restart the backend server after adding the variable

### "JWT verification failed"
- `JWT_SECRET` mismatch between token creation and verification
- Ensure `JWT_SECRET` is the same across all backend instances
- Clear cookies and log in again

### "Anthropic API error"
- Check that `ANTHROPIC_API_KEY` is valid
- Verify API key has not expired or been revoked
- Check spending limits in Anthropic console

### CORS errors in browser
- Verify `FRONTEND_URL` in backend `.env` matches the origin of frontend requests
- Check that frontend is running on the expected port (default: 5173 for Vite)
- Ensure `VITE_API_BASE_URL` in frontend `.env` points to the correct backend URL

### "VITE_* variable is undefined"
- Frontend env variables MUST start with `VITE_` prefix
- Restart Vite dev server after adding new variables
- Check that `frontend/.env` exists and is in the correct location
