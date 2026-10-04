# Implementation Plan: Phase 0 - Project Planning & Schema Design

## Overview

Phase 0 creates four foundational planning documents that serve as ground truth for all Splitwise 2.0 development. This implementation plan breaks down the creation of SCHEMA.md, API_CONTRACT.md, FOLDER_STRUCTURE.md, and ENV_TEMPLATE.md into discrete, verifiable tasks. Each document must precisely specify data models, API contracts, code organization, and configuration with strict adherence to Money_Invariant (integer paise only), Split_Invariant (splits sum to total), and Placeholder_Invariant (exactly one of userId OR placeholderName).

All tasks use **TypeScript** as the implementation language, matching the design specifications.

## Tasks

### Group A: Project Initialization (Vite + Express + TypeScript Setup, Monorepo Scripts)

- [ ] 1. Set up monorepo structure with Vite and Express
  - Create `splitwise-2.0/` root directory with `backend/` and `frontend/` packages
  - Initialize `backend/package.json` with Express, TypeScript, ts-node, nodemon dependencies
  - Initialize `frontend/package.json` with Vite, React, TypeScript, @vitejs/plugin-react dependencies
  - Create `backend/tsconfig.json` with Node.js target and strict mode
  - Create `frontend/tsconfig.json` with DOM support and React JSX
  - Create root `.gitignore` with node_modules, .env, dist, build patterns
  - _Requirements: 3.1, 3.2, 3.7_

- [ ] 2. Add monorepo development scripts and basic Express server
  - Add scripts to root `package.json`: "dev:backend", "dev:frontend", "dev" (runs both concurrently)
  - Create `backend/src/index.ts` with basic Express server setup
  - Add Express middleware: cors, express.json(), express.urlencoded()
  - Configure PORT from environment variable (default 3000)
  - Add startup logging with server URL
  - Create `frontend/vite.config.ts` with API proxy configuration
  - Test that backend starts and frontend can proxy API requests
  - _Requirements: 3.1, 3.2, 4.5, 4.6_

### Group B: Database (Prisma Init, Schema, Migration, Seed)

- [ ] 2. Create comprehensive Prisma schema document (SCHEMA.md)
  - [ ] 2.1 Create SCHEMA.md with header explaining Prisma schema purpose
    - Document Money_Invariant: "All money operations use integer paise only, never floats"
    - Explain ₹1 = 100 paise conversion formula
    - _Requirements: 1.8_

  - [ ] 2.2 Define User model with authentication fields
    - Add id (cuid), email (unique), passwordHash, name, phone (nullable), createdAt
    - Add memberships relation (1:N GroupMember)
    - Add notifications relation (1:N Notification)
    - _Requirements: 1.1_

  - [ ] 2.3 Define Group model with creator tracking
    - Add id (cuid), name, description (nullable), creatorId, createdAt
    - Add creator relation to User
    - Add members relation (1:N GroupMember)
    - Add expenses relation (1:N Expense)
    - _Requirements: 1.2_

  - [ ] 2.4 Define GroupMember model with placeholder support
    - Add id (cuid), groupId, userId (nullable), user relation (nullable)
    - Add placeholderName (nullable), placeholderPhone (nullable), placeholderEmail (nullable)
    - Add joinedAt timestamp
    - Add expenseSplits relation (1:N ExpenseSplit)
    - Add settlementsFrom and settlementsTo relations
    - Document Placeholder_Invariant: "Exactly one of userId OR placeholderName must be non-null"
    - _Requirements: 1.3, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ] 2.5 Define SplitType enum and Expense model
    - Create enum SplitType with values: EQUAL, EXACT, PERCENTAGE, SHARES
    - Add Expense model with id (cuid), groupId, payerId, amount (Int for paise)
    - Add description, date, splitType, createdAt fields
    - Add group and payer relations
    - Add splits relation (1:N ExpenseSplit)
    - Document that amount uses Int type to enforce Money_Invariant
    - _Requirements: 1.4, 5.6_

  - [ ] 2.6 Define ExpenseSplit model for member shares
    - Add id (cuid), expenseId, memberId, amount (Int for paise), share (Float nullable)
    - Add expense and member relations
    - Document that amount stores final calculated paise
    - Document that share stores input percentage/shares for audit trail
    - _Requirements: 1.5_

  - [ ] 2.7 Define Settlement model for manual payments
    - Add id (cuid), groupId, fromId, toId, amount (Int for paise), date, note (nullable)
    - Add from and to relations to GroupMember with explicit relation names
    - Document that amount uses Int type for Money_Invariant
    - _Requirements: 1.6_

  - [ ] 2.8 Define Notification model for user alerts
    - Add id (cuid), userId, message, read (boolean default false), createdAt
    - Add user relation
    - _Requirements: 1.7_

  - [ ] 2.9 Document all invariants and algorithms
    - Add Invariant Documentation section with Money_Invariant explanation
    - Document Split_Invariant: "Sum of ExpenseSplit amounts equals Expense total"
    - Document Rounding_Rule: Rs. 100 ÷ 3 → [34, 33, 33] with first member receiving remainder
    - Document Placeholder_Invariant enforcement at service layer
    - Describe Debt_Minimization: greedy algorithm matching max debtor with max creditor
    - _Requirements: 1.8, 1.9, 1.10, 5.5, 6.4, 6.8, 7.10_

- [ ] 3. Initialize Prisma and create schema from SCHEMA.md
  - Install Prisma CLI and Client: `npm install prisma @prisma/client` in backend
  - Run `npx prisma init` in `backend/` directory
  - Translate SCHEMA.md models into `backend/prisma/schema.prisma` with proper Prisma syntax
  - Configure PostgreSQL datasource with DATABASE_URL from .env
  - Add Prisma Client generator
  - Create `backend/src/prisma/client.ts` with singleton Prisma Client instance
  - _Requirements: 1.1 through 1.10_

- [ ] 4. Create first database migration
  - Ensure PostgreSQL database exists (create manually or via script)
  - Run `npx prisma migrate dev --name init` to create initial migration
  - Verify migration SQL creates all 7 models correctly
  - Run `npx prisma generate` to create TypeScript types
  - Test connection with simple query
  - _Requirements: 1.1 through 1.10_

- [ ] 5. Create comprehensive seed script
  - Create `backend/prisma/seed.ts` with realistic test data
  - Create 3 sample users (Alice, Bob, Charlie) with hashed passwords
  - Create 2 sample groups with members (mix of real and placeholder)
  - Create expenses demonstrating all four split types (EQUAL, EXACT, PERCENTAGE, SHARES)
  - Create sample settlements between members
  - Create sample notifications
  - Add seed script to package.json: `"prisma": { "seed": "ts-node prisma/seed.ts" }`
  - Run seed and verify data via Prisma Studio
  - _Requirements: 1.3, 1.4, 5.1, 5.2, 5.3, 5.4, 7.9_

### Group C: Auth (Register, Login, Logout, /me Endpoints + JWT Middleware)

- [ ] 6. Implement JWT authentication middleware and utilities
  - Install dependencies: `bcryptjs`, `jsonwebtoken`, `@types/bcryptjs`, `@types/jsonwebtoken`
  - Create `backend/src/middleware/authMiddleware.ts` with JWT verification
  - Extract and verify token from Authorization: Bearer header
  - Decode user ID from token and attach to request object (extend Express Request type)
  - Return 401 Unauthorized for invalid/missing/expired tokens
  - Create JWT utility functions for sign and verify
  - _Requirements: 2.1, 2.9, 4.2, 4.3_

- [ ] 7. Implement authentication endpoints
  - [ ] 7.1 Create auth controller with register and login
    - Create `backend/src/controllers/authController.ts`
    - Implement `register` handler: validate email uniqueness, hash password with bcrypt, create User record
    - Implement `login` handler: find user by email, compare password hash, generate JWT token
    - Both handlers return user object (without passwordHash) and JWT token
    - _Requirements: 2.1_

  - [ ] 7.2 Create auth controller with logout and getMe
    - Implement `logout` handler: return success (frontend removes token)
    - Implement `getMe` handler: use authMiddleware, return current user from request.userId
    - _Requirements: 2.1_

  - [ ] 7.3 Create auth routes and wire into Express app
    - Create `backend/src/routes/authRoutes.ts`
    - Mount POST /register and POST /login (no auth required)
    - Mount POST /logout and GET /me (with authMiddleware)
    - Import and mount authRoutes at `/api/auth` in `backend/src/index.ts`
    - Configure CORS with FRONTEND_URL from environment
    - Test: register user, login, access /me with token, verify 401 without token
    - _Requirements: 2.1, 4.6_

- [ ] 8. Create frontend authentication pages and auth service
  - Create `frontend/src/pages/LoginPage.tsx` with email/password form
  - Create `frontend/src/pages/RegisterPage.tsx` with signup form
  - Create `frontend/src/services/authService.ts` with API methods: register, login, logout, getCurrentUser
  - Create `frontend/src/hooks/useAuth.ts` with authentication state management
  - Store JWT token in localStorage
  - Add Authorization header to all API requests via axios/fetch interceptor
  - Create protected route wrapper redirecting to login if not authenticated
  - _Requirements: 2.1_

### Group D: Groups (CRUD Endpoints + Frontend Pages)

- [ ] 9. Implement group CRUD endpoints
  - [ ] 9.1 Create group controller and routes
    - Create `backend/src/controllers/groupController.ts`
    - Implement `create` handler: create Group with current user as creator, auto-add creator as member
    - Implement `list` handler: return all groups where user is a member
    - Implement `get` handler: return single group with members array (hide placeholder emails/phones from non-members)
    - Implement `update` handler: allow name/description changes (auth: only creator or members)
    - Implement `delete` handler: allow deletion (auth: only creator)
    - Create `backend/src/routes/groupRoutes.ts` with all CRUD routes using authMiddleware
    - _Requirements: 2.2_

  - [ ] 9.2 Wire group routes into Express app
    - Import and mount groupRoutes at `/api/groups` in `backend/src/index.ts`
    - Test endpoints: create group, list groups, get group detail, update, delete
    - _Requirements: 2.2_

- [ ] 10. Create frontend group pages and components
  - Create `frontend/src/pages/DashboardPage.tsx` listing user's groups with "Create Group" button
  - Create `frontend/src/pages/GroupDetailPage.tsx` showing group name, members list, expenses list (empty for now)
  - Create `frontend/src/components/groups/GroupCard.tsx` for group list display
  - Create `frontend/src/components/groups/CreateGroupModal.tsx` with form
  - Create `frontend/src/services/groupService.ts` with API methods: create, list, get, update, delete
  - Create `frontend/src/hooks/useGroups.ts` for state management
  - Add React Router routes: /dashboard, /groups/:id
  - _Requirements: 2.2_

### Group E: Members (Add Real + Placeholder Members)
- [ ] 11. Implement member management with placeholder support
  - [ ] 11.1 Create member add endpoint with Placeholder_Invariant validation
    - Add `addMember` handler to groupController
    - Accept either `userId` (for registered user) OR `placeholderName` + optional contact fields
    - Validate Placeholder_Invariant: exactly one of userId OR placeholderName must be provided
    - Return 400 Bad Request if both null or both non-null
    - Create GroupMember record with appropriate fields
    - Add route: POST /api/groups/:groupId/members
    - _Requirements: 2.3, 7.6, 7.7, 7.8, 7.10_

  - [ ] 11.2 Create member remove endpoint
    - Add `removeMember` handler to groupController
    - Validate that user is group creator or removing themselves
    - Check if member has unsettled balances, warn/block if true
    - Delete GroupMember record
    - Add route: DELETE /api/groups/:groupId/members/:memberId
    - _Requirements: 2.3_

- [ ] 12. Create frontend member management components
  - Create `frontend/src/components/groups/AddMemberModal.tsx` with two tabs: "Add User" and "Add Placeholder"
  - "Add User" tab: search/select from registered users by email
  - "Add Placeholder" tab: form with name, phone, email fields
  - Create `frontend/src/components/groups/MemberList.tsx` showing all members with remove button
  - Display badge distinguishing real users vs placeholders
  - Add member management to GroupDetailPage
  - _Requirements: 2.3, 7.6, 7.9_

### Group F: Expenses (Create with All Four Split Types, List, View)
- [ ] 13. Implement split calculation service with all four algorithms
  - [ ] 13.1 Create splitCalculator utility with EQUAL and EXACT
    - Create `backend/src/services/splitCalculator.ts`
    - Implement `calculateEqualSplit(total: number, memberCount: number): number[]`
      - Divide total by member count, apply Rounding_Rule (first member gets remainder)
      - Example: Rs. 100 (10000 paise) ÷ 3 → [3334, 3333, 3333]
    - Implement `calculateExactSplit(amounts: number[]): { valid: boolean, amounts: number[] }`
      - Validate that provided amounts are positive integers
      - Return valid=false if any amount is float or negative
    - Implement `validateSplitInvariant(total: number, splits: number[]): boolean`
      - Return true if sum of splits equals total
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7, 5.10, 9.10_

  - [ ]* 13.2 Write unit tests for EQUAL and EXACT split functions
    - Test Rs. 100 ÷ 3 returns [3334, 3333, 3333]
    - Test Rs. 100 ÷ 4 returns [2500, 2500, 2500, 2500]
    - Test Rs. 101 ÷ 3 returns [3367, 3367, 3366]
    - Test EXACT validation accepts [5000, 3000, 2000] for total 10000
    - Test EXACT validation rejects [5000, 3000, 3000] for total 10000
    - _Requirements: 5.1, 5.2, 5.7_

  - [ ] 13.3 Create splitCalculator with PERCENTAGE and SHARES
    - Implement `calculatePercentageSplit(total: number, percentages: number[]): number[]`
      - Calculate amount per member: total * (percentage / 100)
      - Round down each amount, distribute remainder paise using Rounding_Rule
      - Validate percentages sum to 100
    - Implement `calculateSharesSplit(total: number, shares: number[]): number[]`
      - Calculate total shares: sum of all share values
      - Calculate amount per member: total * (shares / totalShares)
      - Round down each amount, distribute remainder paise using Rounding_Rule
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 5.10, 9.10_

  - [ ]* 13.4 Write unit tests for PERCENTAGE and SHARES split functions
    - Test PERCENTAGE: Rs. 100 with [50, 30, 20] returns [5000, 3000, 2000]
    - Test PERCENTAGE: Rs. 101 with [50, 25, 25] applies Rounding_Rule
    - Test SHARES: Rs. 100 with [2, 1, 1] returns [5000, 2500, 2500]
    - Test SHARES: Rs. 100 with [3, 2, 1] applies Rounding_Rule correctly
    - _Requirements: 5.3, 5.4, 5.7_

- [ ] 14. Implement expense creation endpoints
  - [ ] 14.1 Create expense controller with split type routing
    - Create `backend/src/controllers/expenseController.ts`
    - Implement `create` handler accepting splitType and appropriate split data
    - Route to correct splitCalculator function based on splitType enum
    - Create Expense and ExpenseSplit records in Prisma transaction
    - Validate Split_Invariant before committing transaction
    - Return 400 if invariant validation fails
    - _Requirements: 2.4, 5.7, 9.9_

  - [ ] 14.2 Create expense CRUD routes
    - Create `backend/src/routes/expenseRoutes.ts`
    - POST /api/groups/:groupId/expenses - create with authMiddleware + group membership check
    - GET /api/groups/:groupId/expenses - list expenses with splits (paginated)
    - GET /api/expenses/:id - get single expense detail
    - PUT /api/expenses/:id - update expense (only creator, recalculates splits)
    - DELETE /api/expenses/:id - delete expense (only creator)
    - Mount at `/api` in main Express app
    - Test all four split types with sample data
    - _Requirements: 2.4_

- [ ] 15. Implement money utilities for rupee/paise conversion
  - Create `backend/src/utils/moneyUtils.ts`
  - Implement `paiseToRupees(paise: number): string` returning formatted "100.50"
  - Implement `rupeesToPaise(rupees: string): number` parsing string to integer paise
  - Handle edge cases: empty string, negative values, invalid formats
  - Create matching `frontend/src/utils/moneyFormat.ts` for display formatting
  - _Requirements: 9.4, 9.5_

- [ ] 16. Create frontend expense form with split type selector
  - Create `frontend/src/pages/ExpenseFormPage.tsx` with comprehensive form
  - Add split type dropdown: EQUAL, EXACT, PERCENTAGE, SHARES
  - Dynamically render split input fields based on selected type:
    - EQUAL: member checkboxes only
    - EXACT: amount input (in rupees) per member
    - PERCENTAGE: percentage input per member with real-time sum validation
    - SHARES: integer shares input per member
  - Convert rupees to paise before API call
  - Display validation errors from backend
  - Create `frontend/src/services/expenseService.ts` with API methods
  - Add expense creation to GroupDetailPage
  - _Requirements: 2.4, 5.8, 9.6, 9.7_

- [ ] 17. Create frontend expense list and detail views
  - Create `frontend/src/components/expenses/ExpenseCard.tsx` showing payer, amount, description, date
  - Create `frontend/src/components/expenses/ExpenseDetail.tsx` showing full split breakdown per member
  - Display amounts in rupees using moneyFormat utility (Rs. 100.50 format)
  - Add expense list to GroupDetailPage with filter/sort options
  - Add "Add Expense" button linking to ExpenseFormPage
  - Create `frontend/src/hooks/useExpenses.ts` for state management
  - _Requirements: 2.4, 9.7_

- [ ] 18. Checkpoint - Verify expense creation with all split types
  - Test creating expense with EQUAL split
  - Test creating expense with EXACT split
  - Test creating expense with PERCENTAGE split
  - Test creating expense with SHARES split
  - Verify Split_Invariant validation catches mismatched totals
  - Verify Money_Invariant: all amounts stored as integer paise in database
  - Ask the user if questions arise

### Group G: Balances (Raw Pairwise + Optimized Display)
- [ ] 19. Implement balance calculation engine
  - [ ] 19.1 Create balance calculation service
    - Create `backend/src/services/balanceEngine.ts`
    - Implement `calculateNetBalances(groupId: string): Promise<Balance[]>`
      - Fetch all expenses and settlements for group
      - For each member pair, calculate: (amount member owes from splits) - (amount member paid) - (settlements)
      - Return array of { from: memberId, to: memberId, amount: paise } for positive balances only
      - Use integer arithmetic only (Money_Invariant)
    - _Requirements: 6.2, 6.9, 9.10_

  - [ ] 19.2 Create debt minimization algorithm
    - Implement `minimizeTransfers(balances: Balance[]): Transfer[]`
      - Calculate net balance per member: sum of (owed to them) - sum of (they owe)
      - Create creditors array (positive net) and debtors array (negative net)
      - Use greedy algorithm: match largest debtor with largest creditor repeatedly
      - Return optimized transfer list with fewer transactions
      - Verify sum of optimized transfers equals sum of raw balances
    - _Requirements: 6.3, 6.4, 6.7, 6.8_

  - [ ]* 19.3 Write unit tests for balance engine
    - Test 3-person scenario: A paid 30, B paid 40, C paid 20, equal split (30 each)
      - Raw: A owes B 10, C owes A 10, C owes B 10 (3 transfers)
      - Optimized: C owes B 20, B pays A 10 (2 transfers)
    - Test that net balances sum to zero
    - Test single creditor, multiple debtors scenario
    - _Requirements: 6.7, 6.10_

- [ ] 20. Implement balance endpoints
  - Create `backend/src/controllers/balanceController.ts`
  - Implement `getGroupBalances` handler:
    - Call balanceEngine.calculateNetBalances for raw pairwise balances
    - Call balanceEngine.minimizeTransfers for optimized list
    - Return both arrays: `{ rawBalances: [...], optimizedTransfers: [...] }`
  - Create `backend/src/routes/balanceRoutes.ts`
  - Add route: GET /api/groups/:groupId/balances (with authMiddleware)
  - Mount routes in main Express app
  - Test endpoint returns both raw and optimized data
  - _Requirements: 2.5, 6.1, 6.5, 6.10_

- [ ] 21. Create frontend balance display components
  - Create `frontend/src/components/balances/BalanceList.tsx`
  - Display optimized transfers in simplified view: "Alice owes Bob Rs. 50.00"
  - Add toggle to show raw pairwise balances for transparency
  - Use moneyFormat utility to display amounts in rupees
  - Add "Settle Up" button next to each transfer (links to settlement flow)
  - Create balance tab in GroupDetailPage
  - _Requirements: 2.5, 6.6_

### Group H: Manual Settlement (Mark as Settled Flow)
- [ ] 22. Implement settlement recording endpoints
  - Create `backend/src/controllers/settlementController.ts`
  - Implement `create` handler:
    - Accept fromId (debtor), toId (creditor), amount (in paise), optional note
    - Validate that fromId and toId are different members in the same group
    - Create Settlement record
    - Update balances (settlements reduce future balance calculations)
  - Implement `list` handler: return all settlements for a group
  - Create `backend/src/routes/settlementRoutes.ts`
  - Add routes: POST /api/groups/:groupId/settlements, GET /api/groups/:groupId/settlements
  - Mount routes in main Express app
  - _Requirements: 2.6_

- [ ] 23. Create frontend settlement flow
  - Create `frontend/src/components/balances/SettleUpModal.tsx`
  - Pre-fill fromId, toId, amount from balance transfer
  - Allow user to enter partial amount or add note
  - Call settlement API endpoint on submit
  - Refresh balance list after successful settlement
  - Create `frontend/src/components/balances/SettlementHistory.tsx` showing past settlements
  - Add settlement history tab to GroupDetailPage
  - _Requirements: 2.6_

- [ ] 24. Final checkpoint - End-to-end Phase 1 MVP verification
  - Run complete database migration and seed
  - Start backend server (verify all endpoints accessible)
  - Start frontend dev server (verify connects to backend)
  - Test complete user flow:
    1. Register new account
    2. Login and reach dashboard
    3. Create group "Weekend Trip"
    4. Add 2 registered users and 1 placeholder member
    5. Create expense with EQUAL split
    6. Create expense with EXACT split
    7. Create expense with PERCENTAGE split
    8. Create expense with SHARES split
    9. View balances tab showing raw and optimized transfers
    10. Record settlement between two members
    11. Verify balance updates after settlement
  - Verify all amounts display correctly in rupees (Rs. X.XX format)
  - Verify all amounts stored as integer paise in database (check via Prisma Studio)
  - Verify Money_Invariant, Split_Invariant, Placeholder_Invariant all enforced
  - Ensure all tests pass, ask the user if questions arise

## Phase 1 MVP Complete

The Phase 1 Core MVP is now complete with all essential features:
- ✅ Group A: Project initialization (Vite + Express + TypeScript + monorepo)
- ✅ Group B: Database (Prisma schema, migration, seed)
- ✅ Group C: Auth (register, login, logout, /me + JWT)
- ✅ Group D: Groups (CRUD endpoints + frontend pages)
- ✅ Group E: Members (real + placeholder support)
- ✅ Group F: Expenses (all four split types + frontend forms)
- ✅ Group G: Balances (raw pairwise + optimized display)
- ✅ Group H: Manual settlement (mark as settled flow)

## Future Phases (Not in This Task List)

**Phase 2 - Enhanced Features:**
- Notifications system for expense additions and settlements
- AI-powered expense parsing from natural language
- AI-powered bill scanning with OCR
- Group activity feed
- Export to CSV/PDF

**Phase 3 - Polish & Deployment:**
- Comprehensive error handling and validation
- Loading states and optimistic UI updates
- Mobile responsive design
- Production deployment (Docker + PostgreSQL + hosting)
- Documentation and README

## Notes

- Tasks marked with `*` are optional test-related sub-tasks and can be skipped for faster implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation (Tasks 18, 24)
- All money operations use integer paise following Money_Invariant
- Split calculations validate Split_Invariant before database save
- Member operations validate Placeholder_Invariant at service layer
- TypeScript is used throughout matching the design specifications
- This task list covers Phase 1 Core MVP only - additional features are planned for future phases
