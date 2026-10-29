# Splitwise 2.0

A modern expense splitting application that simplifies group finances with AI-powered features. Unlike the original Splitwise, version 2.0 introduces natural language expense entry, AI bill scanning for automatic itemized splits, trip mode with auto-archival, debt minimization algorithms, and UPI deep links for instant payments—all while maintaining precise penny-accurate calculations using integer arithmetic.

## Live Demo

[Frontend](URL) | [Backend API](URL)

*(Note: Fill in actual URLs after deployment)*

## Features

- **Flexible Expense Splitting** — Equal, Exact, Percentage, and Shares split types for any scenario
- **AI Expense Entry** — Type a sentence like "Dinner at Pizza Hut for 2500 rupees split with Alice and Bob" and get a pre-filled expense form
- **AI Bill Scanning** — Upload a receipt photo, get automatic line item detection with intelligent tax distribution
- **Debt Minimization** — Greedy algorithm reduces settlement transfers from O(n²) to O(n log n)
- **Trip Mode** — Time-bound groups that auto-archive with comprehensive final summary reports
- **UPI Deep Links** — One-tap payment buttons that open users' preferred UPI app pre-filled with amount and recipient
- **Placeholder Members** — Split expenses with people who aren't on the platform yet

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React + TypeScript + Vite | Fast builds, type safety, modern DX |
| **Backend** | Express + TypeScript + Node.js | Lightweight, flexible, TypeScript end-to-end |
| **Database** | PostgreSQL (Neon) | Relational integrity, cloud-native, free tier |
| **ORM** | Prisma | Type-safe queries, excellent migrations, auto-complete |
| **Auth** | JWT + httpOnly cookies | Secure, stateless, XSS-resistant |
| **AI** | Google Gemini | Free tier, multimodal (text + vision), fast inference |
| **Hosting** | Vercel (frontend) + Render (backend) | Zero-config deploys, generous free tiers |

## Architecture Decisions

- **Integer paise instead of float rupees** — Eliminates floating-point rounding errors. All money stored as `Int` (paise), converted to rupees only at display layer. A ₹10.50 expense is stored as `1050`.

- **httpOnly cookies instead of localStorage for JWT** — Prevents XSS attacks from stealing tokens. The token is never accessible to JavaScript, only sent automatically by the browser on same-origin requests.

- **Balance engine uses greedy matching** — After computing net balances, a max-heap and min-heap match largest debtor with largest creditor iteratively, reducing the number of transactions from potentially dozens to the mathematical minimum.

- **AI parsing has mandatory confirm step** — Gemini occasionally misreads amounts or names. A confirmation screen with confidence badges (🟢 high, 🟡 medium, 🔴 low) lets users correct errors before database commit. No AI output is ever saved directly.

- **Auto-archive runs on dashboard load instead of cron** — Free-tier hosting doesn't support background jobs. Instead, expired trips are archived when the next user loads their dashboard after the `tripEndDate`. This trades slight UX delay for zero infrastructure cost.

## Local Development

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL (or use cloud DB like Neon)
- Google Gemini API key (free at [ai.google.dev](https://ai.google.dev))

### Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd splitwise-2.0
   ```

2. **Install all dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```

3. **Configure backend environment** — Create `backend/.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/splitwise2_dev"
   JWT_SECRET="your-super-secret-jwt-key-min-32-chars-long-change-in-production"
   JWT_EXPIRES_IN="7d"
   GEMINI_API_KEY="AIzaSy-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   PORT=5000
   NODE_ENV="development"
   FRONTEND_URL="http://localhost:5173"
   ```

4. **Configure frontend environment** — Create `frontend/.env`:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   ```

5. **Run database migrations**
   ```bash
   cd backend
   npx prisma migrate dev
   ```

6. **Seed the database** (optional)
   ```bash
   npx prisma db seed
   ```

7. **Start development servers**
   ```bash
   # From project root
   cd backend && npm run dev
   # In another terminal
   cd frontend && npm run dev
   ```

   Backend runs on [http://localhost:5000](http://localhost:5000)  
   Frontend runs on [http://localhost:5173](http://localhost:5173)

## Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set **Root Directory** to `frontend/`
3. Set **Build Command** to `npm run build`
4. Set **Output Directory** to `dist`
5. Add environment variable:
   - `VITE_API_BASE_URL` = `https://your-backend.onrender.com/api`

### Backend (Render)
1. Connect your GitHub repository to Render
2. Select "Web Service" type
3. Render auto-detects `render.yaml` configuration
4. Set these environment variables in dashboard:
   - `DATABASE_URL` = (your Neon PostgreSQL connection string)
   - `JWT_SECRET` = (generate a secure random string, min 32 chars)
   - `GEMINI_API_KEY` = (your Google AI API key)
   - `FRONTEND_URL` = (your Vercel deployment URL)
5. Deploy triggers automatically on git push

### Database (Neon)
Already cloud-hosted. Run migrations after deploying backend:
```bash
# SSH into Render or use Render shell
npx prisma migrate deploy
```

## Known Limitations

- **UPI integration uses deep links (MVP)** — Payment confirmation is manual. The "Pay via UPI" button opens the user's UPI app but doesn't provide a webhook callback. Users must return to the app and click "Settle Up" to record the payment. Webhook-based auto-confirmation requires a paid payment gateway like Razorpay (integration is architected but not implemented).

- **AI parsing occasionally misreads amounts** — Gemini vision models are not 100% accurate with handwritten receipts or poor lighting. The mandatory confirmation screen prevents incorrect data from reaching the database, but users must review all AI-parsed expenses.

- **Render free tier sleeps after 15 minutes of inactivity** — First request after sleep takes ~30 seconds to wake up. This is a free-tier limitation. Upgrading to Render's paid tier eliminates cold starts.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](LICENSE)
