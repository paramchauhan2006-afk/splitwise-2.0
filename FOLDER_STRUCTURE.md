# Splitwise 2.0 — Folder Structure

This document shows the complete monorepo folder and file tree for Splitwise 2.0. The project is organized as a monorepo with two main packages: `frontend/` (React + Vite) and `backend/` (Express + Prisma).

---

## Complete Folder Tree

```
splitwise-2.0/
│
├── frontend/                           # React 18 + Vite app
│   ├── src/
│   │   ├── components/                 # Reusable UI components
│   │   │   ├── ui/                     # shadcn/ui base components (Button, Input, Card, etc.)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/                 # Layout components
│   │   │   │   ├── Header.tsx          # Top navigation bar
│   │   │   │   ├── Sidebar.tsx         # Side navigation (mobile)
│   │   │   │   └── Footer.tsx
│   │   │   ├── expense/                # Expense-specific components
│   │   │   │   ├── ExpenseCard.tsx     # Single expense display card
│   │   │   │   ├── ExpenseForm.tsx     # Form for creating/editing expenses
│   │   │   │   ├── SplitTypeSelector.tsx  # UI for choosing EQUAL/EXACT/PERCENTAGE/SHARES
│   │   │   │   └── ExpenseList.tsx     # Paginated expense list
│   │   │   ├── group/                  # Group-specific components
│   │   │   │   ├── GroupCard.tsx       # Single group display card
│   │   │   │   ├── GroupForm.tsx       # Form for creating/editing groups
│   │   │   │   └── MemberList.tsx      # Display group members
│   │   │   ├── balance/                # Balance and settlement components
│   │   │   │   ├── BalanceCard.tsx     # Display pairwise balance
│   │   │   │   ├── OptimizedTransferList.tsx  # Display minimized transfer list
│   │   │   │   └── SettlementForm.tsx  # Form for recording settlements
│   │   │   ├── ai/                     # AI feature components
│   │   │   │   ├── NLPExpenseInput.tsx  # Natural language input box
│   │   │   │   ├── BillScanner.tsx     # Image upload + scan trigger
│   │   │   │   └── AIConfirmScreen.tsx  # Review screen for AI-generated data
│   │   │   └── notification/           # Notification components
│   │   │       ├── NotificationBell.tsx  # Bell icon with unread count
│   │   │       └── NotificationList.tsx  # Dropdown list of notifications
│   │   │
│   │   ├── pages/                      # One file per route/screen
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx       # Login screen
│   │   │   │   ├── RegisterPage.tsx    # Registration screen
│   │   │   │   └── ProfilePage.tsx     # User profile
│   │   │   ├── groups/
│   │   │   │   ├── GroupsListPage.tsx  # List of all user's groups
│   │   │   │   ├── GroupDetailPage.tsx # Single group detail view
│   │   │   │   └── CreateGroupPage.tsx # Create new group
│   │   │   ├── expenses/
│   │   │   │   ├── CreateExpensePage.tsx  # Create new expense
│   │   │   │   ├── ExpenseDetailPage.tsx  # Single expense detail
│   │   │   │   └── EditExpensePage.tsx    # Edit existing expense
│   │   │   ├── balances/
│   │   │   │   └── BalancesPage.tsx    # Group balances with optimized transfers
│   │   │   ├── settlements/
│   │   │   │   └── SettlementsPage.tsx # Record and view settlements
│   │   │   └── HomePage.tsx            # Landing/dashboard page
│   │   │
│   │   ├── hooks/                      # Custom React hooks
│   │   │   ├── useAuth.ts              # Authentication state and actions
│   │   │   ├── useGroups.ts            # Fetch and manage groups
│   │   │   ├── useExpenses.ts          # Fetch and manage expenses
│   │   │   ├── useBalances.ts          # Fetch balance data
│   │   │   ├── useNotifications.ts     # Fetch and manage notifications
│   │   │   └── useDebounce.ts          # Utility hook for debouncing input
│   │   │
│   │   ├── lib/                        # API client and utility functions
│   │   │   ├── api.ts                  # Axios instance with interceptors for JWT cookies
│   │   │   ├── apiClient.ts            # Typed API client functions (auth, groups, expenses, etc.)
│   │   │   └── queryClient.ts          # React Query client configuration
│   │   │
│   │   ├── stores/                     # Global state (Zustand)
│   │   │   ├── authStore.ts            # Current user state
│   │   │   └── notificationStore.ts    # Notification state
│   │   │
│   │   ├── utils/                      # Utility functions
│   │   │   ├── moneyUtils.ts           # Convert paise ↔ rupees, format currency
│   │   │   ├── dateUtils.ts            # Date formatting utilities
│   │   │   └── validators.ts           # Form validation helpers
│   │   │
│   │   ├── types/                      # Shared TypeScript types
│   │   │   ├── user.ts                 # User type definitions
│   │   │   ├── group.ts                # Group and GroupMember types
│   │   │   ├── expense.ts              # Expense, ExpenseSplit, SplitType types
│   │   │   ├── settlement.ts           # Settlement types
│   │   │   ├── notification.ts         # Notification types
│   │   │   └── api.ts                  # API request/response types
│   │   │
│   │   ├── App.tsx                     # Main app component with routing
│   │   ├── main.tsx                    # Vite entry point
│   │   └── index.css                   # Global styles + Tailwind imports
│   │
│   ├── public/                         # Static assets
│   │   ├── favicon.ico
│   │   └── logo.svg
│   │
│   ├── .env.example                    # Example environment variables
│   ├── .gitignore
│   ├── index.html                      # HTML entry point for Vite
│   ├── package.json                    # Frontend dependencies
│   ├── tsconfig.json                   # TypeScript config
│   ├── tsconfig.node.json              # TypeScript config for Vite
│   ├── vite.config.ts                  # Vite configuration
│   ├── tailwind.config.js              # Tailwind CSS configuration
│   ├── postcss.config.js               # PostCSS configuration for Tailwind
│   └── components.json                 # shadcn/ui configuration
│
├── backend/                            # Express + Prisma API
│   ├── src/
│   │   ├── routes/                     # Express route definitions
│   │   │   ├── index.ts                # Main router that combines all sub-routers
│   │   │   ├── auth.routes.ts          # /api/auth/* routes
│   │   │   ├── groups.routes.ts        # /api/groups/* routes
│   │   │   ├── members.routes.ts       # /api/groups/:groupId/members/* routes
│   │   │   ├── expenses.routes.ts      # /api/groups/:groupId/expenses/* routes
│   │   │   ├── balances.routes.ts      # /api/groups/:groupId/balances route
│   │   │   ├── settlements.routes.ts   # /api/groups/:groupId/settlements/* routes
│   │   │   ├── ai.routes.ts            # /api/ai/* routes
│   │   │   └── notifications.routes.ts # /api/notifications/* routes
│   │   │
│   │   ├── controllers/                # Request handlers
│   │   │   ├── auth.controller.ts      # Handles register, login, logout, /me
│   │   │   ├── groups.controller.ts    # Handles group CRUD operations
│   │   │   ├── members.controller.ts   # Handles member addition/removal
│   │   │   ├── expenses.controller.ts  # Handles expense CRUD operations
│   │   │   ├── balances.controller.ts  # Handles balance calculation
│   │   │   ├── settlements.controller.ts  # Handles settlement recording
│   │   │   ├── ai.controller.ts        # Handles AI parsing and scanning
│   │   │   └── notifications.controller.ts  # Handles notification operations
│   │   │
│   │   ├── services/                   # Business logic (core algorithms)
│   │   │   ├── splitCalculator.ts      # Split calculation algorithms
│   │   │   │   # Exports:
│   │   │   │   # - calculateEqualSplit(totalPaise, memberCount): number[]
│   │   │   │   #   Divides total equally, applies rounding rule (first member gets remainder)
│   │   │   │   # - calculateExactSplit(splits: {memberId, amount}[]): {memberId, amount}[]
│   │   │   │   #   Validates that sum equals total (Split Invariant)
│   │   │   │   # - calculatePercentageSplit(totalPaise, splits: {memberId, percentage}[]): {memberId, amount}[]
│   │   │   │   #   Converts percentages to amounts, applies rounding rule
│   │   │   │   # - calculateSharesSplit(totalPaise, splits: {memberId, shares}[]): {memberId, amount}[]
│   │   │   │   #   Converts integer shares to proportional amounts, applies rounding rule
│   │   │   │   # - validateSplitInvariant(splits: number[], total: number): boolean
│   │   │   │   #   Ensures sum(splits) === total
│   │   │   │   # - applyRoundingRule(amounts: number[], total: number): number[]
│   │   │   │   #   Distributes remainder paise to first or largest member
│   │   │   │
│   │   │   ├── balanceEngine.ts        # Balance calculation and debt minimization
│   │   │   │   # Exports:
│   │   │   │   # - calculateNetBalances(expenses: Expense[], settlements: Settlement[]): Balance[]
│   │   │   │   #   Computes raw pairwise balances from expense splits and settlements
│   │   │   │   #   Returns array of {fromMemberId, toMemberId, amountPaise}
│   │   │   │   # - minimizeTransfers(balances: Balance[]): Transfer[]
│   │   │   │   #   Implements greedy debt minimization algorithm
│   │   │   │   #   Algorithm: Repeatedly match max debtor with max creditor until all settled
│   │   │   │   #   Returns optimized array of {fromMemberId, toMemberId, amountPaise}
│   │   │   │   #   Ensures sum of transfers equals sum of raw balances (Money Invariant preserved)
│   │   │   │
│   │   │   ├── aiService.ts            # Anthropic Claude API integration
│   │   │   │   # Exports:
│   │   │   │   # - parseExpenseFromText(text: string, groupId: string): Promise<ParsedExpense>
│   │   │   │   #   Uses Claude Sonnet 4-6 model for natural language understanding
│   │   │   │   #   Extracts description, amount (in paise), participants, split type
│   │   │   │   #   Returns pre-filled expense object with confidence score
│   │   │   │   #   DOES NOT save to database — returns data for confirm screen only
│   │   │   │   # - scanBillFromImage(imageBuffer: Buffer, groupId: string): Promise<ScannedBill>
│   │   │   │   #   Uses Claude Sonnet 4-6 vision model for bill/receipt OCR
│   │   │   │   #   Extracts line items, subtotal, tax, discount, grand total (all in paise)
│   │   │   │   #   Returns structured data with confidence score
│   │   │   │   #   DOES NOT save to database — returns data for confirm screen only
│   │   │   │   # - buildClaudePrompt(type: 'nlp' | 'vision', input: string | Buffer): string
│   │   │   │   #   Helper to construct prompts for Claude API
│   │   │   │
│   │   │   ├── auth.service.ts         # Authentication logic (bcrypt, JWT)
│   │   │   ├── groups.service.ts       # Group business logic
│   │   │   ├── members.service.ts      # Member management logic (validates Placeholder Invariant)
│   │   │   ├── expenses.service.ts     # Expense business logic (validates Split Invariant)
│   │   │   ├── settlements.service.ts  # Settlement business logic
│   │   │   └── notifications.service.ts  # Notification creation and management
│   │   │
│   │   ├── middleware/                 # Express middleware
│   │   │   ├── auth.middleware.ts      # JWT verification, attach user to req
│   │   │   ├── errorHandler.ts         # Global error handling middleware
│   │   │   ├── validator.ts            # Request body validation (Zod schemas)
│   │   │   └── groupMembership.ts      # Verify user is member of group
│   │   │
│   │   ├── lib/                        # Utility libraries
│   │   │   ├── prisma.ts               # Prisma client singleton
│   │   │   ├── anthropic.ts            # Anthropic API client singleton
│   │   │   ├── jwt.ts                  # JWT sign/verify helpers
│   │   │   └── bcrypt.ts               # Password hashing helpers
│   │   │
│   │   ├── utils/                      # Utility functions
│   │   │   ├── moneyUtils.ts           # Money conversion and validation
│   │   │   │   # Exports:
│   │   │   │   # - paiseToRupees(paise: number): number
│   │   │   │   #   Converts integer paise to decimal rupees (divide by 100)
│   │   │   │   # - rupeesToPaise(rupees: number): number
│   │   │   │   #   Converts decimal rupees to integer paise (multiply by 100, floor)
│   │   │   │   # - formatCurrency(paise: number): string
│   │   │   │   #   Formats paise as "₹X,XXX.XX" string
│   │   │   │   # - validatePaise(value: any): boolean
│   │   │   │   #   Ensures value is integer (Money Invariant check)
│   │   │   │
│   │   │   ├── dateUtils.ts            # Date formatting and parsing
│   │   │   └── responseFormatter.ts    # Standard API response format
│   │   │
│   │   ├── types/                      # TypeScript types
│   │   │   ├── express.d.ts            # Extended Express Request type (with user)
│   │   │   ├── prisma.ts               # Re-exported Prisma types
│   │   │   └── api.ts                  # API request/response types
│   │   │
│   │   ├── server.ts                   # Express app setup and middleware registration
│   │   └── index.ts                    # Entry point (starts server)
│   │
│   ├── prisma/
│   │   ├── schema.prisma               # Prisma schema (see SCHEMA.md)
│   │   ├── migrations/                 # Prisma migration files
│   │   │   └── (auto-generated migration folders)
│   │   └── seed.ts                     # Database seeding script for dev/test
│   │
│   ├── .env.example                    # Example environment variables
│   ├── .gitignore
│   ├── package.json                    # Backend dependencies
│   ├── tsconfig.json                   # TypeScript config
│   └── nodemon.json                    # Nodemon config for hot-reloading
│
├── SCHEMA.md                           # Database schema documentation
├── API_CONTRACT.md                     # API endpoint documentation
├── FOLDER_STRUCTURE.md                 # This file
├── ENV_TEMPLATE.md                     # Environment variables documentation
├── README.md                           # Project overview and setup instructions
├── .gitignore                          # Root gitignore
└── package.json                        # Root package.json (workspace management)
```

---

## Key Service Files Explained

### backend/src/services/splitCalculator.ts

**Purpose**: Implements all four expense split algorithms with correct rounding behavior to ensure the Split Invariant always holds.

**Exported Functions**:

1. **`calculateEqualSplit(totalPaise: number, memberCount: number): number[]`**
   - Divides `totalPaise` equally among `memberCount` members
   - Example: 10000 paise ÷ 3 members → [3334, 3333, 3333]
   - Applies rounding rule: first member receives remainder paise (1 extra paise in this case)
   - Returns array of amounts in paise

2. **`calculateExactSplit(splits: {memberId: string, amountPaise: number}[]): {memberId: string, amountPaise: number}[]`**
   - Validates that sum of provided amounts equals total (Split Invariant)
   - No calculation needed — amounts are explicit
   - Throws error if Split Invariant violated
   - Returns validated splits array

3. **`calculatePercentageSplit(totalPaise: number, splits: {memberId: string, percentage: number}[]): {memberId: string, amountPaise: number}[]`**
   - Validates that sum of percentages equals 100.0
   - Calculates amount for each member: `Math.floor(totalPaise * percentage / 100)`
   - Applies rounding rule to distribute remainder paise
   - Returns array of {memberId, amountPaise}

4. **`calculateSharesSplit(totalPaise: number, splits: {memberId: string, shares: number}[]): {memberId: string, amountPaise: number}[]`**
   - Sums all shares to get total shares
   - Calculates proportional amount for each member: `Math.floor(totalPaise * shares / totalShares)`
   - Applies rounding rule to distribute remainder paise
   - Returns array of {memberId, amountPaise}

5. **`validateSplitInvariant(splits: number[], totalPaise: number): boolean`**
   - Utility function to check if sum of splits equals total
   - Used across all split types to ensure Money Invariant preserved
   - Returns true if valid, throws error if invalid

6. **`applyRoundingRule(amounts: number[], totalPaise: number): number[]`**
   - Helper function to distribute remainder paise
   - Rule: First member (or member with largest amount if equal) gets extra paise
   - Example: [3333, 3333, 3333] with 1 remainder → [3334, 3333, 3333]
   - Ensures sum equals total exactly

---

### backend/src/services/balanceEngine.ts

**Purpose**: Calculates net balances between group members and optimizes transfer list to minimize payments needed to settle all debts.

**Exported Functions**:

1. **`calculateNetBalances(groupId: string): Promise<Balance[]>`**
   - Fetches all expenses and settlements for a group from database
   - For each expense, calculates who owes whom based on splits
   - Subtracts settlements from owed amounts
   - Aggregates pairwise balances between every pair of members
   - Returns array of `{fromMemberId, toMemberId, amountPaise}` representing raw debt graph
   - Example output:
     ```typescript
     [
       { fromMemberId: "mem_001", toMemberId: "mem_002", amountPaise: 15000 },
       { fromMemberId: "mem_003", toMemberId: "mem_001", amountPaise: 25000 },
       { fromMemberId: "mem_003", toMemberId: "mem_002", amountPaise: 10000 }
     ]
     ```

2. **`minimizeTransfers(balances: Balance[]): Transfer[]`**
   - Implements greedy debt minimization algorithm
   - **Algorithm steps**:
     1. Calculate net position for each member (sum of credits minus sum of debits)
     2. Create two lists: creditors (positive balance) and debtors (negative balance)
     3. Repeat while both lists non-empty:
        - Find max creditor and max debtor
        - Settle with min(creditor balance, debtor balance)
        - Remove settled members from lists
     4. Return optimized transfer list
   - **Example**:
     - Input (3 raw transfers): A→B: ₹150, C→A: ₹250, C→B: ₹100
     - Net positions: A: +₹100, B: +₹250, C: -₹350
     - Output (2 optimized transfers): C→A: ₹100, C→B: ₹250
   - Ensures sum of optimized transfers equals sum of raw balances (Money Invariant preserved)
   - Returns array of `{fromMemberId, toMemberId, amountPaise}`

---

### backend/src/services/aiService.ts

**Purpose**: Integrates with Anthropic Claude API to provide NLP expense parsing and bill scanning features.

**Model**: `claude-sonnet-4-6` (Anthropic's latest Sonnet model with vision support)

**Exported Functions**:

1. **`parseExpenseFromText(text: string, groupId: string): Promise<ParsedExpense>`**
   - Accepts natural language text like "I paid Rs. 900 for dinner for me, Aman and Rohan"
   - Constructs Claude prompt to extract structured expense data
   - Sends request to Anthropic API with `claude-sonnet-4-6` model
   - Parses Claude response to extract:
     - `description`: Brief expense description
     - `totalAmountPaise`: Total amount in integer paise (converted from extracted rupees)
     - `splitType`: Inferred split type (usually EQUAL for NLP)
     - `participants`: List of participant names (matched to group members if possible)
     - `date`: Inferred date or current date
     - `confidence`: 0.0-1.0 confidence score
   - **CRITICAL**: Returns pre-filled object ONLY. Does NOT save to database.
   - Frontend must display on confirm screen for user review before saving.

2. **`scanBillFromImage(imageBuffer: Buffer, groupId: string): Promise<ScannedBill>`**
   - Accepts image file buffer (JPEG, PNG, WebP)
   - Converts image to base64 for Claude vision API
   - Constructs Claude vision prompt to extract bill/receipt data
   - Sends request to Anthropic API with `claude-sonnet-4-6` model (vision-enabled)
   - Parses Claude response to extract:
     - `items`: Array of line items with description, quantity, unit price, total (all in paise)
     - `subtotalPaise`: Sum of line items
     - `taxPaise`: Extracted tax amount
     - `discountPaise`: Extracted discount amount
     - `grandTotalPaise`: Final bill total
     - `date`: Bill date if available
     - `vendor`: Merchant/vendor name if available
     - `confidence`: 0.0-1.0 confidence score
   - **CRITICAL**: Returns structured data ONLY. Does NOT save to database.
   - Frontend must display on confirm screen for user review before saving.

3. **`buildClaudePrompt(type: 'nlp' | 'vision', input: any): string`**
   - Helper function to construct prompts for Claude API
   - For NLP type: Creates prompt explaining expense parsing task with examples
   - For vision type: Creates prompt explaining bill OCR task with formatting instructions
   - Includes instructions to always return amounts in rupees (converted to paise by service)
   - Returns formatted prompt string

**Implementation Notes**:
- Uses `@anthropic-ai/sdk` npm package
- API key stored in `ANTHROPIC_API_KEY` environment variable
- Implements error handling for API failures
- Both endpoints include `warning` field in response: "This is AI-generated data. Please review before saving."
- All money amounts converted to integer paise following Money Invariant

---

## Dependency Summary

### Frontend Dependencies
- **React 18** — UI library
- **TypeScript** — Type safety
- **Vite** — Build tool and dev server
- **React Router** — Client-side routing
- **Tailwind CSS** — Utility-first CSS framework
- **shadcn/ui** — Pre-built accessible component library
- **Axios** — HTTP client for API calls
- **React Query** — Server state management
- **Zustand** — Client state management
- **Zod** — Schema validation

### Backend Dependencies
- **Node.js** — Runtime
- **TypeScript** — Type safety
- **Express** — Web framework
- **Prisma** — ORM and database toolkit
- **PostgreSQL** — Database (via Prisma)
- **bcrypt** — Password hashing
- **jsonwebtoken** — JWT token generation/verification
- **@anthropic-ai/sdk** — Anthropic Claude API client
- **cookie-parser** — Parse JWT cookies
- **cors** — CORS middleware
- **dotenv** — Environment variable loading
- **Zod** — Request validation
- **Nodemon** — Dev hot-reloading

---

## Separation of Concerns

This folder structure enforces clear separation of concerns:

- **Routes** define URL endpoints and HTTP methods
- **Controllers** handle HTTP requests/responses and call services
- **Services** contain all business logic and algorithms
- **Middleware** handles cross-cutting concerns (auth, validation, errors)
- **Lib** provides reusable clients and helpers
- **Utils** provides pure utility functions

All money operations use the `moneyUtils` functions to ensure integer paise arithmetic. All split calculations go through `splitCalculator.ts`. All balance optimization uses `balanceEngine.ts`. All AI features use `aiService.ts`.
