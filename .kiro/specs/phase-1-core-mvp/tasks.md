# Implementation Plan: Phase 1 Core MVP

## Overview

This implementation plan breaks down the Phase 1 Core MVP into atomic, verifiable tasks organized into 8 groups. Each task is designed to be independently executable and testable. All tasks use TypeScript for both backend and frontend implementation.

The implementation follows the ground-truth documents from Phase 0 (SCHEMA.md, API_CONTRACT.md, FOLDER_STRUCTURE.md, ENV_TEMPLATE.md) and enforces four critical invariants: Money Invariant (all money as integer paise), Split Invariant (sum of splits equals total), Placeholder Invariant (member has exactly one of userId OR placeholderName), and Rounding Rule (first member gets remainder paise).

---

## Tasks

### Group A: Project Initialization

- [ ] A1. Initialize root-level monorepo structure
  - Create root package.json with "workspaces": ["backend", "frontend"]
  - Add "dev" script that runs both backend and frontend using concurrently
  - Create .gitignore file excluding node_modules, .env files, dist, build outputs
  - _Requirements: 1.1, 1.2, 1.9_

- [ ] A2. Initialize backend workspace
  - Create backend/package.json with dependencies: express, typescript, @types/node, @types/express, prisma, @prisma/client, bcrypt, @types/bcrypt, jsonwebtoken, @types/jsonwebtoken, cookie-parser, @types/cookie-parser, cors, @types/cors, dotenv, zod
  - Add dev dependencies: tsx, nodemon, ts-node
  - Configure "dev" script: nodemon --exec tsx src/server.ts
  - _Requirements: 1.3_

- [ ] A3. Initialize frontend workspace
  - Create frontend/package.json with dependencies: react@^18, react-dom@^18, typescript, vite, @vitejs/plugin-react, react-router-dom, tailwindcss, postcss, autoprefixer, axios, @tanstack/react-query, zustand, zod
  - Configure "dev" script: vite
  - Configure "build" script: tsc && vite build
  - _Requirements: 1.4_

- [ ] A4. Configure TypeScript for backend
  - Create backend/tsconfig.json with target: ES2020, module: commonjs, moduleResolution: node, strict: true, esModuleInterop: true
  - Set outDir: ./dist, rootDir: ./src
  - _Requirements: 1.5_

- [ ] A5. Configure TypeScript for frontend
  - Create frontend/tsconfig.json with target: ESNext, module: ESNext, jsx: react-jsx, moduleResolution: bundler, strict: true
  - Configure Vite path aliases if needed
  - _Requirements: 1.6_

- [ ] A6. Create environment templates
  - Create backend/.env.example matching ENV_TEMPLATE.md (DATABASE_URL, JWT_SECRET, PORT, NODE_ENV, FRONTEND_URL)
  - Create frontend/.env.example matching ENV_TEMPLATE.md (VITE_API_BASE_URL)
  - _Requirements: 1.7, 1.8_

- [ ] A7. Verify monorepo setup
  - Run npm install from root to install all workspace dependencies
  - Verify npm run dev starts both servers without errors
  - _Requirements: 1.10_

---

### Group B: Database Setup

- [ ] B1. Create Prisma schema with User model
  - Initialize Prisma in backend: npx prisma init
  - Define User model with fields: id (cuid), name, email (unique), passwordHash, phone (nullable), avatarUrl (nullable), createdAt, updatedAt
  - _Requirements: 2.1, 2.2_

- [ ] B2. Add Group model to schema
  - Define Group model with fields: id (cuid), name, description (nullable), createdByUserId, isTrip (default false), tripEndDate (nullable), isArchived (default false), defaultCurrency (default "INR"), createdAt, updatedAt
  - Add foreign key relation to User
  - _Requirements: 2.3_

- [ ] B3. Add GroupMember model to schema
  - Define GroupMember model with fields: id (cuid), groupId, userId (nullable), placeholderName (nullable), placeholderPhone (nullable), placeholderEmail (nullable), role (enum: ADMIN/MEMBER, default MEMBER), joinedAt
  - Add foreign key relations to Group and User
  - Add unique index on [groupId, userId] where userId is not null
  - _Requirements: 2.4_

- [ ] B4. Add Expense model to schema
  - Define Expense model with fields: id (cuid), groupId, description, totalAmountPaise (Int), paidByUserId, splitType (enum: EQUAL/EXACT/PERCENTAGE/SHARES), date, notes (nullable), receiptImageUrl (nullable), isRecurring (default false), recurringCronExpression (nullable), createdByUserId, createdAt, updatedAt
  - Add foreign key relations to Group and User
  - Add index on groupId
  - _Requirements: 2.5_

- [ ] B5. Add ExpenseSplit and Settlement models to schema
  - Define ExpenseSplit model with fields: id (cuid), expenseId, groupMemberId, amountPaise (Int), isSettled (default false), settledAt (nullable)
  - Define Settlement model with fields: id (cuid), groupId, fromGroupMemberId, toGroupMemberId, amountPaise (Int), method (enum: MANUAL/UPI_DEEPLINK/UPI_GATEWAY), upiTransactionId (nullable), note (nullable), settledAt, createdAt
  - Add foreign key relations with onDelete cascade behaviors
  - Add indexes on expenseId and groupId
  - _Requirements: 2.6, 2.7_

- [ ] B6. Add Notification model to schema
  - Define Notification model with fields: id (cuid), userId, type (enum: REMINDER/TRIP_ARCHIVED/EXPENSE_ADDED/SETTLEMENT_RECEIVED/SETTLEMENT_SENT), title, body, isRead (default false), relatedGroupId (nullable), relatedExpenseId (nullable), createdAt
  - Add foreign key relations
  - Add index on [userId, isRead]
  - _Requirements: 2.8_

- [ ] B7. Verify schema and create migration
  - Verify all foreign key relationships match SCHEMA.md
  - Verify all indexes match SCHEMA.md
  - Run npx prisma migrate dev --name initial_schema
  - Verify database tables created without errors
  - _Requirements: 2.9, 2.10, 2.11_

- [ ] B8. Create Prisma client singleton
  - Create backend/src/lib/prisma.ts file
  - Export singleton PrismaClient instance with proper connection handling
  - Implement graceful shutdown on process termination
  - _Requirements: 2.12_

- [ ] B9. Create database seed script
  - Create backend/prisma/seed.ts with 3 users with bcrypt-hashed passwords
  - Create 2 groups with first user as creator
  - Add all 3 users to first group (first as ADMIN, others as MEMBER)
  - Add 1 placeholder member to first group with placeholderName and placeholderPhone
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] B10. Add seed data for all split types
  - Create 1 EQUAL split expense with at least 3 members
  - Create 1 EXACT split expense with manually specified amounts
  - Create 1 PERCENTAGE split expense with percentages summing to 100
  - Create 1 SHARES split expense with integer share values
  - Verify all expenses satisfy Split Invariant (sum of splits equals total)
  - _Requirements: 3.6, 3.7, 3.8, 3.9, 3.12_

- [ ] B11. Add settlement seed data
  - Create at least 1 settlement between two members
  - Configure seed script in package.json: "prisma": { "seed": "tsx prisma/seed.ts" }
  - Run npx prisma db seed and verify all data created without errors
  - _Requirements: 3.10, 3.11_

---

### Group C: Authentication

- [ ] C1. Create money utility functions
  - Create backend/src/utils/moneyUtils.ts file
  - Implement rupeesToPaise(rupees: number): number function that multiplies by 100 and rounds
  - Implement paiseToRupees(paise: number): number function that divides by 100
  - Implement formatCurrency(paise: number): string function that formats as "₹X,XXX.XX"
  - Implement validatePaise(value: any): boolean function that checks for integer
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

- [ ] C2. Create JWT utility functions
  - Create backend/src/lib/jwt.ts file
  - Implement signToken(payload: { userId: string }): string using jsonwebtoken.sign with JWT_SECRET
  - Implement verifyToken(token: string): { userId: string } using jsonwebtoken.verify
  - Implement generateCookieOptions(): CookieOptions with httpOnly: true, sameSite: 'lax', maxAge: 7 days, secure: true if NODE_ENV is production
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

- [ ] C3. Create authentication middleware
  - Create backend/src/middleware/auth.middleware.ts file
  - Extract JWT token from req.cookies.token
  - Return 401 if token is missing or invalid
  - Decode userId from valid token and attach to req.user
  - Call next() to proceed to route handler
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [ ] C4. Create global error handler middleware
  - Create backend/src/middleware/errorHandler.ts file
  - Implement error handler that returns consistent error response format: { success: false, error: { code, message } }
  - Handle Prisma errors, validation errors, and generic errors
  - _Requirements: 6.8, 6.9, 6.10_

- [ ] C5. Create authentication service
  - Create backend/src/services/auth.service.ts file
  - Implement registerUser function that hashes password with bcrypt and creates User
  - Implement loginUser function that verifies password with bcrypt.compare
  - Return user object without passwordHash field
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] C6. Create authentication controller and routes
  - Create backend/src/controllers/auth.controller.ts file
  - Implement POST /api/auth/register that calls auth.service, signs JWT, sets httpOnly cookie, returns 201 with user
  - Implement POST /api/auth/login that validates credentials, signs JWT, sets cookie, returns 200 with user
  - Handle 409 for duplicate email, 401 for invalid credentials
  - Implement GET /api/auth/me that returns authenticated user data or 401
  - Create backend/src/routes/auth.routes.ts and wire up controller
  - _Requirements: 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13_

- [ ] C7. Create Express server with middleware chain
  - Create backend/src/server.ts file
  - Configure CORS with origin from FRONTEND_URL env var and credentials: true
  - Add express.json() and express.urlencoded() middleware
  - Add cookie-parser middleware
  - Mount /api routes
  - Add global error handler as last middleware
  - Start server on PORT from env var
  - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7, 22.8_

- [ ] C8. Create frontend Axios instance
  - Create frontend/src/lib/api.ts file
  - Configure Axios instance with baseURL from VITE_API_BASE_URL
  - Set withCredentials: true to send cookies
  - Add response interceptor for 401 error handling
  - _Requirements: 8.7, 8.8, 8.9_

- [ ] C9. Create frontend auth store
  - Create frontend/src/stores/authStore.ts using Zustand
  - Implement currentUser state (User | null)
  - Implement login action that calls POST /api/auth/login
  - Implement register action that calls POST /api/auth/register
  - Implement logout action that clears currentUser
  - Implement fetchMe action that calls GET /api/auth/me on app load
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.11, 8.12_

- [ ] C10. Create frontend authentication pages
  - Create frontend/src/pages/auth/LoginPage.tsx with login form
  - Create frontend/src/pages/auth/RegisterPage.tsx with registration form
  - Both pages use authStore actions
  - Add React Router routes for /login and /register
  - Store user in authStore on successful authentication
  - _Requirements: 8.10, 8.11_

- [ ] C11. Add authentication state initialization
  - Call authStore.fetchMe() in App.tsx on mount to restore auth state from cookie
  - Show loading state while fetching
  - _Requirements: 8.12_

---

### Group D: Groups Management

- [ ] D1. Create groups service
  - Create backend/src/services/groups.service.ts file
  - Implement createGroup function that creates Group and auto-adds creator as ADMIN GroupMember
  - Implement getGroupsByUserId function that returns all groups where user is a member
  - Implement getGroupById function that returns group with all members
  - Implement updateGroup function that updates group details
  - Implement archiveGroup function that sets isArchived to true
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] D2. Create groups controller and routes
  - Create backend/src/controllers/groups.controller.ts file
  - Implement POST /api/groups that creates group and returns 201
  - Implement GET /api/groups that returns all user's groups
  - Implement GET /api/groups/:groupId that verifies membership and returns group details or 403
  - Implement PATCH /api/groups/:groupId that verifies ADMIN role and updates group or returns 403
  - Implement DELETE /api/groups/:groupId that verifies ADMIN role and archives group
  - Create backend/src/routes/groups.routes.ts and wire up controller with authMiddleware
  - _Requirements: 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12_

- [ ] D3. Create membership verification middleware
  - Create backend/src/middleware/membership.middleware.ts file
  - Implement middleware that checks if authenticated user is a member of the group in params
  - Return 403 if user is not a member
  - Attach membership info (including role) to req object
  - Call next() if user is a member
  - _Requirements: 9.6, 9.7_

- [ ] D4. Create frontend groups hooks
  - Create frontend/src/hooks/useGroups.ts using React Query
  - Implement useGroups hook that fetches GET /api/groups
  - Implement useGroup hook that fetches GET /api/groups/:groupId
  - Implement useCreateGroup mutation
  - Implement useUpdateGroup mutation
  - Configure cache invalidation on mutations
  - _Requirements: 10.4_

- [ ] D5. Create frontend groups list page
  - Create frontend/src/pages/groups/GroupsListPage.tsx
  - Fetch and display all user's groups using useGroups hook
  - Display group cards with name, description, member count
  - Add "Create Group" button that navigates to create page
  - Click group card to navigate to group detail page
  - _Requirements: 10.1, 10.5, 10.6_

- [ ] D6. Create frontend group creation page
  - Create frontend/src/pages/groups/CreateGroupPage.tsx
  - Form with fields for name, description
  - Call useCreateGroup mutation on submit
  - Navigate to new group's detail page on success
  - _Requirements: 10.3, 10.7, 10.8_

- [ ] D7. Create frontend group detail page
  - Create frontend/src/pages/groups/GroupDetailPage.tsx
  - Display group name, description, member list
  - Show "Edit" button only if current user is ADMIN
  - Display member count prominently
  - _Requirements: 10.2, 10.9, 10.10_

- [ ] D8. Add group edit functionality
  - Add inline or modal edit form on GroupDetailPage
  - Allow editing name and description
  - Call useUpdateGroup mutation on submit
  - Show edit UI only to ADMIN users
  - _Requirements: 10.11, 10.12_

---

### Group E: Members Management

- [ ] E1. Create members service with Placeholder Invariant validation
  - Create backend/src/services/members.service.ts file
  - Implement addMemberByEmail function that finds User by email and creates GroupMember with userId
  - Implement addPlaceholderMember function that creates GroupMember with placeholderName and nullable userId
  - Implement validatePlaceholderInvariant function that throws error if both userId and placeholderName are null OR both are non-null
  - Call validatePlaceholderInvariant before every GroupMember.create
  - Implement getMembersByGroupId function that returns all members with isPlaceholder flag
  - Implement removeMember function that checks for unsettled balances before deletion
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.8_

- [ ] E2. Create members controller and routes
  - Create backend/src/controllers/members.controller.ts file
  - Implement POST /api/groups/:groupId/members that accepts email OR placeholderName
  - Return 400 if both userId and placeholderName are null or both are non-null (Placeholder Invariant)
  - Return 201 with member object on success
  - Implement GET /api/groups/:groupId/members that returns all members with isPlaceholder flag
  - Implement DELETE /api/groups/:groupId/members/:memberId that checks ADMIN role and unsettled balances
  - Create backend/src/routes/members.routes.ts and wire up controller
  - _Requirements: 11.7, 11.9, 11.10, 11.11, 11.12, 11.13_

- [ ] E3. Create frontend member list component
  - Create frontend/src/components/group/MemberList.tsx
  - Display all group members with badges for role (ADMIN/MEMBER) and type (Placeholder)
  - Show remove button for each member (only visible to ADMINs)
  - Call DELETE /api/groups/:groupId/members/:memberId on remove
  - Display error message if removal fails due to unsettled balances
  - _Requirements: 12.1, 12.8, 12.9, 12.10, 12.11, 12.12_

- [ ] E4. Create frontend add member modal
  - Create frontend/src/components/group/AddMemberModal.tsx
  - Two tabs: "Registered User" and "Placeholder"
  - Registered User tab: email input field
  - Placeholder tab: name and phone input fields
  - Call POST /api/groups/:groupId/members with appropriate payload
  - Refresh member list on success
  - _Requirements: 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

---

### Group F: Expenses with Split Calculation

- [ ] F1. Create split calculator service
  - Create backend/src/services/splitCalculator.ts file
  - Implement calculateEqualSplit(totalPaise: number, memberIds: string[]): CalculatedSplit[]
  - Use Math.floor for base amount, apply Rounding Rule (first member gets remainder)
  - Example: 10000 paise ÷ 3 members = [3334, 3333, 3333]
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] F2. Add exact split calculation
  - Implement calculateExactSplit(totalPaise: number, splits: ExactSplit[]): CalculatedSplit[]
  - Validate that sum of splits equals total, throw error if not
  - Return splits unchanged if valid
  - _Requirements: 13.5, 13.6, 13.7_

- [ ] F3. Add percentage split calculation
  - Implement calculatePercentageSplit(totalPaise: number, splits: PercentageSplit[]): CalculatedSplit[]
  - Validate percentages sum to 100, throw error if not
  - Calculate amounts with Math.floor, apply Rounding Rule to first member for remainder
  - _Requirements: 13.8, 13.9_

- [ ] F4. Add shares split calculation
  - Implement calculateSharesSplit(totalPaise: number, splits: SharesSplit[]): CalculatedSplit[]
  - Calculate amounts with Math.floor based on share ratios
  - Apply Rounding Rule: member with most shares gets remainder
  - Example: 1800000 paise, shares [2, 1, 2] = [720000, 360000, 720000]
  - _Requirements: 13.10, 13.11, 13.12_

- [ ] F5. Add split invariant validator
  - Implement validateSplitInvariant(amounts: number[], totalPaise: number): void
  - Calculate sum of amounts, throw error if sum !== totalPaise
  - Call this validator at end of every split calculation function
  - _Requirements: 13.13, 13.14, 13.15, 13.16_

- [ ] F6. Create expenses service with transaction
  - Create backend/src/services/expenses.service.ts file
  - Implement createExpense function that accepts expense data and split type
  - Call appropriate split calculator based on splitType
  - Validate Split Invariant before database operations
  - Use Prisma transaction to create Expense and all ExpenseSplit records atomically
  - Validate Split Invariant again before commit
  - Rollback transaction if invariant violated
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

- [ ] F7. Create expenses controller and routes
  - Create backend/src/controllers/expenses.controller.ts file
  - Implement POST /api/groups/:groupId/expenses that calls expenses.service
  - Return 400 if Split Invariant violated
  - Return 201 with expense and splits on success
  - Implement GET /api/groups/:groupId/expenses with pagination
  - Implement GET /api/groups/:groupId/expenses/:expenseId that includes all splits with member names
  - Create backend/src/routes/expenses.routes.ts and wire up controller
  - _Requirements: 14.9, 14.10, 14.11, 14.12_

- [ ] F8. Create frontend expense hooks
  - Create frontend/src/hooks/useExpenses.ts using React Query
  - Implement useExpenses hook that fetches GET /api/groups/:groupId/expenses
  - Implement useExpense hook that fetches single expense with splits
  - Implement useCreateExpense mutation
  - Configure cache invalidation for expenses and balances on mutation
  - _Requirements: 15.8, 15.11_

- [ ] F9. Create frontend expense creation page
  - Create frontend/src/pages/expenses/CreateExpensePage.tsx
  - Form fields: description, total amount (rupees), paid by (member dropdown), split type (dropdown), date
  - Convert rupee input to paise using rupeesToPaise before submitting
  - Dynamic split inputs based on selected split type
  - _Requirements: 15.1, 15.2, 15.7_

- [ ] F10. Add dynamic split type forms
  - EQUAL: multi-select for members
  - EXACT: amount input per selected member with sum validation
  - PERCENTAGE: percentage input per selected member with 100% validation
  - SHARES: integer share input per selected member
  - Validate EXACT sum equals total before submit
  - Validate PERCENTAGE sum equals 100 before submit
  - _Requirements: 15.3, 15.4, 15.5, 15.6, 15.9, 15.10_

- [ ] F11. Add expense submission and navigation
  - Submit form to POST /api/groups/:groupId/expenses
  - Navigate to group expenses list on success
  - Display error messages for validation failures
  - _Requirements: 15.8, 15.11_

- [ ] F12. Create frontend expense detail page
  - Create frontend/src/pages/expenses/ExpenseDetailPage.tsx
  - Display expense description, total amount, paid by, split type, date
  - Display all splits with member names and amounts in rupees
  - Use formatCurrency to display amounts
  - _Requirements: 15.12_

---

### Group G: Balance Calculation and Minimization

- [ ] G1. Create balance engine service
  - Create backend/src/services/balanceEngine.ts file
  - Implement calculateNetBalances(groupId: string): Promise<Balance[]>
  - Fetch all expenses with splits and all settlements for the group
  - Build debt map: for each expense split, split member owes payer (skip if same person)
  - Subtract settlement amounts from corresponding debts
  - Return array of pairwise balances excluding zero balances
  - Ensure all returned amounts are positive integers in paise
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10_

- [ ] G2. Implement debt minimization algorithm
  - Implement minimizeTransfers(balances: Balance[]): Transfer[] in balanceEngine.ts
  - Calculate each member's net position (total credits minus total debits)
  - Create creditors list (positive net) and debtors list (negative net)
  - Implement greedy algorithm: match max creditor with max debtor repeatedly
  - Create transfer for min(creditor balance, debtor balance)
  - Update net positions and remove members with zero balance
  - Repeat until both lists empty
  - Verify sum of optimized transfers equals sum of raw balances
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7, 17.8, 17.9, 17.10, 17.11_

- [ ] G3. Create balances controller and routes
  - Create backend/src/controllers/balances.controller.ts file
  - Implement GET /api/groups/:groupId/balances that calls calculateNetBalances
  - Call minimizeTransfers on raw balances
  - Fetch member names for all members in both lists
  - Return response with rawBalances and optimizedTransfers arrays
  - Include summary with totalRawTransfers, totalOptimizedTransfers, and savingsCount
  - Verify user is group member, return 403 if not
  - Create backend/src/routes/balances.routes.ts and wire up controller
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8, 18.9, 18.10_

- [ ] G4. Create frontend balances hooks
  - Create frontend/src/hooks/useBalances.ts using React Query
  - Implement useBalances hook that fetches GET /api/groups/:groupId/balances
  - Configure automatic refetch on focus and interval
  - _Requirements: 19.10_

- [ ] G5. Create frontend balances page
  - Create frontend/src/pages/balances/BalancesPage.tsx
  - Display optimizedTransfers list by default
  - Add toggle/tab to switch between optimized and raw balances views
  - Display each transfer as card: "X pays Y ₹Z.ZZ"
  - Use formatCurrency utility to convert paise to rupees display
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6_

- [ ] G6. Add savings display and settle up buttons
  - Display savings count prominently (e.g., "Minimized from 5 to 3 transfers")
  - Add "Settle Up" button next to each optimized transfer
  - Open settlement form modal on button click with pre-filled data
  - _Requirements: 19.7, 19.8, 19.9_

---

### Group H: Settlements

- [ ] H1. Create settlements service
  - Create backend/src/services/settlements.service.ts file
  - Implement createSettlement function that validates fromMemberId !== toMemberId
  - Validate amountPaise > 0
  - Create Settlement record with method MANUAL and current timestamp as settledAt
  - Implement getSettlementsByGroupId function that returns settlements ordered by settledAt desc
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

- [ ] H2. Create settlements controller and routes
  - Create backend/src/controllers/settlements.controller.ts file
  - Implement POST /api/groups/:groupId/settlements that validates and creates settlement
  - Return 400 if fromMemberId equals toMemberId or amountPaise <= 0
  - Return 201 with settlement object on success
  - Implement GET /api/groups/:groupId/settlements that returns all settlements with member names
  - Verify requesting user is group member before allowing operations
  - Create backend/src/routes/settlements.routes.ts and wire up controller
  - _Requirements: 20.7, 20.8, 20.9, 20.10_

- [ ] H3. Create frontend settlements hooks
  - Create frontend/src/hooks/useSettlements.ts using React Query
  - Implement useSettlements hook that fetches GET /api/groups/:groupId/settlements
  - Implement useCreateSettlement mutation
  - Configure cache invalidation for settlements and balances on mutation
  - _Requirements: 21.10_

- [ ] H4. Create frontend settlement form modal
  - Create frontend/src/components/balance/SettlementForm.tsx
  - Form fields: from member (dropdown), to member (dropdown), amount (rupees), note (optional)
  - Accept pre-fill data from "Settle Up" button (fromMemberId, toMemberId, amountPaise)
  - Convert rupee input to paise before submitting
  - Call POST /api/groups/:groupId/settlements on submit
  - Close modal and refresh balances on success
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_

- [ ] H5. Create frontend settlements history page
  - Create frontend/src/pages/settlements/SettlementsPage.tsx
  - Display settlement history as cards: "X paid Y ₹Z.ZZ on DATE"
  - Display note if present
  - Format amounts using formatCurrency
  - Order by date descending (most recent first)
  - _Requirements: 21.7, 21.8, 21.9_

---

## Checkpoints

- [ ] Checkpoint 1: Verify project initialization
  - Run npm install from root successfully
  - Run npm run dev and verify both servers start without errors
  - Ensure all environment variables are properly configured
  - Ensure all tests pass, ask the user if questions arise.

- [ ] Checkpoint 2: Verify database setup
  - Prisma migration completes without errors
  - All 7 models created in database
  - Seed script runs successfully
  - Verify in Prisma Studio: 3 users, 2 groups, 4+ expenses (one per split type), 1 settlement
  - Verify Split Invariant holds for all seeded expenses
  - Verify no Float columns exist (all money stored as Int)
  - Ensure all tests pass, ask the user if questions arise.

- [ ] Checkpoint 3: Verify authentication
  - POST /api/auth/register creates user and sets httpOnly cookie
  - POST /api/auth/login validates credentials and sets cookie
  - GET /api/auth/me returns user data with valid cookie, 401 without cookie
  - Frontend login/register pages work end-to-end
  - Auth state persists across page refresh
  - Ensure all tests pass, ask the user if questions arise.

- [ ] Checkpoint 4: Verify groups and members
  - POST /api/groups creates group and auto-adds creator as ADMIN
  - POST /api/groups/:groupId/members accepts email and creates user member
  - POST /api/groups/:groupId/members accepts placeholderName and creates placeholder member
  - POST /api/groups/:groupId/members returns 400 when both or neither identifier provided
  - Frontend group creation and member management UI works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] Checkpoint 5: Verify expenses with all split types
  - POST /api/groups/:groupId/expenses with EQUAL split applies Rounding Rule correctly
  - POST /api/groups/:groupId/expenses with EXACT split validates sum equals total
  - POST /api/groups/:groupId/expenses with PERCENTAGE validates sum equals 100%
  - POST /api/groups/:groupId/expenses with SHARES calculates correctly (e.g., [2,1,2] for 1800000)
  - All created expenses satisfy Split Invariant
  - Frontend expense creation form adapts to each split type
  - Ensure all tests pass, ask the user if questions arise.

- [ ] Checkpoint 6: Verify balances and minimization
  - GET /api/groups/:groupId/balances returns both rawBalances and optimizedTransfers
  - Debt minimization algorithm reduces transfer count correctly
  - Sum of optimized transfers equals sum of raw balances (Money Invariant preserved)
  - Frontend displays both views with toggle
  - Savings count displayed correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] Checkpoint 7: Verify settlements
  - POST /api/groups/:groupId/settlements creates settlement successfully
  - GET /api/groups/:groupId/balances reflects reduced debts after settlement
  - Frontend settlement form modal works with pre-filled data
  - Settlement history displays correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] Checkpoint 8: End-to-end verification
  - Complete user flow: register → create group → add members → create expenses → view balances → record settlement
  - Verify all four invariants hold throughout: Money, Split, Placeholder, Rounding Rule
  - Test with seed data and verify all features work
  - Cross-check against API_CONTRACT.md for endpoint compliance
  - Verify CORS and cookie credentials work in development environment
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- All tasks use TypeScript for implementation
- Each task is atomic and independently verifiable
- Tasks reference specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- All money operations use integer paise, never floating-point
- The four invariants (Money, Split, Placeholder, Rounding Rule) are enforced throughout
- Split calculations always validate the Split Invariant before returning
- Database transactions ensure atomicity for multi-record operations
- Frontend uses React Query for server state and Zustand for client state
- Authentication uses JWT tokens in httpOnly cookies for security
- CORS configured with credentials: true for cross-origin cookie support
