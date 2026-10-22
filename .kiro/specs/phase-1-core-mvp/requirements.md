# Requirements Document: Phase 1 Core MVP Implementation

## Introduction

This document defines the requirements for Phase 1 of Splitwise 2.0, which implements the core MVP functionality including project setup, database implementation, authentication, groups, members, expenses with four split types, balance calculation with debt minimization, and manual settlements. Phase 1 builds upon the ground-truth planning documents (SCHEMA.md, API_CONTRACT.md, FOLDER_STRUCTURE.md, ENV_TEMPLATE.md) created in Phase 0 and MUST follow them exactly.

The system implements expense sharing for groups of users, supporting both registered users and placeholder (unregistered) members. All money operations use integer paise to avoid floating-point errors, and the system enforces critical invariants for data integrity.

## Glossary

- **System**: The Splitwise 2.0 application (frontend + backend)
- **Backend**: The Express + TypeScript + Prisma API server
- **Frontend**: The React + TypeScript + Vite web application
- **Database**: The PostgreSQL database accessed via Prisma ORM
- **Prisma_Client**: The singleton Prisma database client instance
- **Auth_Middleware**: JWT authentication middleware that validates tokens from httpOnly cookies
- **JWT_Token**: JSON Web Token stored in httpOnly cookie for authentication
- **User**: A registered user account with email and password
- **Group**: A collection of members who share expenses
- **Member**: A participant in a group (either a registered User or a placeholder)
- **Placeholder_Member**: An unregistered group participant identified by name and optional contact info
- **Expense**: A monetary transaction paid by one member and split among multiple members
- **Split_Calculator**: Service that implements the four split type algorithms
- **Split_Type**: One of four algorithms for dividing expenses (EQUAL, EXACT, PERCENTAGE, SHARES)
- **Balance_Engine**: Service that calculates net balances and optimizes transfers
- **Settlement**: A payment from one member to another that reduces debt
- **Money_Invariant**: Rule that all money values are stored as integer paise (₹1 = 100 paise)
- **Split_Invariant**: Rule that sum of all split amounts must equal the expense total
- **Placeholder_Invariant**: Rule that a Member has exactly one of userId OR placeholderName (never both, never neither)
- **Rounding_Rule**: When splits don't divide evenly, the first member gets the remainder paise
- **Debt_Minimization**: Algorithm that reduces the number of transfers needed to settle all debts
- **Paise**: Integer money unit (100 paise = ₹1)
- **Rupees**: Decimal money unit (user-facing currency display)

---

## Requirements

### Requirement 1: Monorepo Project Initialization

**User Story**: As a developer, I want the project structure initialized with all necessary configuration files, so that I can start implementing features immediately.

#### Acceptance Criteria

1. THE System SHALL have a root-level package.json with "frontend" and "backend" workspace definitions
2. THE Root_Package SHALL include a "dev" script that runs both frontend and backend concurrently
3. THE Backend SHALL have a package.json with Express, TypeScript, Prisma, bcrypt, jsonwebtoken, cookie-parser, cors, dotenv, and Zod dependencies
4. THE Frontend SHALL have a package.json with React 18, TypeScript, Vite, React Router, Tailwind CSS, Axios, React Query, Zustand, and Zod dependencies
5. THE Backend SHALL have a tsconfig.json configured for Node.js with ES2020 target
6. THE Frontend SHALL have a tsconfig.json configured for React with ESNext target
7. THE Backend SHALL have a .env.example file matching ENV_TEMPLATE.md
8. THE Frontend SHALL have a .env.example file matching ENV_TEMPLATE.md
9. THE Root SHALL have a .gitignore file that excludes node_modules, .env files, and build outputs
10. WHEN "npm run dev" is executed from the root, THE System SHALL start both frontend and backend servers without errors

---

### Requirement 2: Database Schema Implementation

**User Story**: As a developer, I want the Prisma schema implemented exactly as specified in SCHEMA.md, so that all database models and relationships are correctly defined.

#### Acceptance Criteria

1. THE Backend SHALL have a prisma/schema.prisma file with all 7 models (User, Group, GroupMember, Expense, ExpenseSplit, Settlement, Notification)
2. THE User_Model SHALL have fields: id (cuid), name, email (unique), passwordHash, phone (nullable), avatarUrl (nullable), createdAt, updatedAt
3. THE Group_Model SHALL have fields: id (cuid), name, description (nullable), createdByUserId, isTrip (default false), tripEndDate (nullable), isArchived (default false), defaultCurrency (default "INR"), createdAt, updatedAt
4. THE GroupMember_Model SHALL have fields: id (cuid), groupId, userId (nullable), placeholderName (nullable), placeholderPhone (nullable), placeholderEmail (nullable), role (enum: ADMIN/MEMBER, default MEMBER), joinedAt
5. THE Expense_Model SHALL have fields: id (cuid), groupId, description, totalAmountPaise (Int), paidByUserId, splitType (enum: EQUAL/EXACT/PERCENTAGE/SHARES), date, notes (nullable), receiptImageUrl (nullable), isRecurring (default false), recurringCronExpression (nullable), createdByUserId, createdAt, updatedAt
6. THE ExpenseSplit_Model SHALL have fields: id (cuid), expenseId, groupMemberId, amountPaise (Int), isSettled (default false), settledAt (nullable)
7. THE Settlement_Model SHALL have fields: id (cuid), groupId, fromGroupMemberId, toGroupMemberId, amountPaise (Int), method (enum: MANUAL/UPI_DEEPLINK/UPI_GATEWAY), upiTransactionId (nullable), note (nullable), settledAt, createdAt
8. THE Notification_Model SHALL have fields: id (cuid), userId, type (enum: REMINDER/TRIP_ARCHIVED/EXPENSE_ADDED/SETTLEMENT_RECEIVED/SETTLEMENT_SENT), title, body, isRead (default false), relatedGroupId (nullable), relatedExpenseId (nullable), createdAt
9. THE Schema SHALL define all foreign key relationships with appropriate onDelete cascade behaviors
10. THE Schema SHALL define all indexes as specified in SCHEMA.md
11. WHEN "npx prisma migrate dev" is executed, THE Database SHALL create all tables without errors
12. THE Backend SHALL have a lib/prisma.ts file that exports a singleton Prisma_Client instance

---

### Requirement 3: Database Seed Script

**User Story**: As a developer, I want a comprehensive seed script with test data, so that I can test all features with realistic data including all four split types.

#### Acceptance Criteria

1. THE Backend SHALL have a prisma/seed.ts file that creates test data
2. THE Seed_Script SHALL create 3 users with valid bcrypt password hashes
3. THE Seed_Script SHALL create 2 groups with the first user as creator
4. THE Seed_Script SHALL add all 3 users as members to the first group (first user as ADMIN, others as MEMBER)
5. THE Seed_Script SHALL add 1 placeholder member to the first group with placeholderName and placeholderPhone
6. THE Seed_Script SHALL create at least 1 expense with EQUAL split type
7. THE Seed_Script SHALL create at least 1 expense with EXACT split type
8. THE Seed_Script SHALL create at least 1 expense with PERCENTAGE split type
9. THE Seed_Script SHALL create at least 1 expense with SHARES split type
10. THE Seed_Script SHALL create at least 1 settlement between two members
11. WHEN "npx prisma db seed" is executed, THE Database SHALL be populated with all test data without errors
12. FOR ALL seeded expenses, THE Split_Invariant SHALL hold (sum of split amounts equals expense total)

---

### Requirement 4: Money Utilities Implementation

**User Story**: As a developer, I want money conversion and validation utilities, so that all money operations follow the Money_Invariant.

#### Acceptance Criteria

1. THE Backend SHALL have a utils/moneyUtils.ts file
2. THE Money_Utils SHALL export a rupeesToPaise function that converts decimal rupees to integer paise
3. WHEN rupeesToPaise receives 10.50 rupees, THE Function SHALL return 1050 paise
4. THE Money_Utils SHALL export a paiseToRupees function that converts integer paise to decimal rupees
5. WHEN paiseToRupees receives 1050 paise, THE Function SHALL return 10.50 rupees
6. THE Money_Utils SHALL export a formatCurrency function that formats paise as rupee string
7. WHEN formatCurrency receives 125000 paise, THE Function SHALL return "₹1,250.00"
8. THE Money_Utils SHALL export a validatePaise function that checks if a value is a valid integer
9. WHEN validatePaise receives a non-integer value, THE Function SHALL return false
10. WHEN validatePaise receives an integer value, THE Function SHALL return true

---

### Requirement 5: JWT Authentication Utilities

**User Story**: As a developer, I want JWT token signing and verification utilities, so that user authentication is secure and consistent.

#### Acceptance Criteria

1. THE Backend SHALL have a lib/jwt.ts file
2. THE JWT_Utils SHALL export a signToken function that creates JWT tokens with userId payload
3. WHEN signToken receives a userId, THE Function SHALL return a JWT string signed with JWT_SECRET
4. THE JWT_Utils SHALL export a verifyToken function that validates JWT tokens
5. WHEN verifyToken receives a valid token, THE Function SHALL return the decoded payload with userId
6. WHEN verifyToken receives an invalid token, THE Function SHALL throw an error
7. THE JWT_Utils SHALL export a generateCookieOptions function that returns httpOnly cookie settings
8. THE Cookie_Options SHALL include httpOnly: true, sameSite: 'lax', and maxAge: 7 days
9. WHEN NODE_ENV is "production", THE Cookie_Options SHALL include secure: true
10. WHEN NODE_ENV is "development", THE Cookie_Options SHALL include secure: false

---

### Requirement 6: Authentication Middleware Implementation

**User Story**: As a developer, I want authentication middleware that validates JWT tokens from httpOnly cookies, so that protected routes can verify user identity.

#### Acceptance Criteria

1. THE Backend SHALL have a middleware/auth.middleware.ts file
2. THE Auth_Middleware SHALL read the JWT token from req.cookies.token
3. WHEN the token cookie is missing, THE Auth_Middleware SHALL return 401 Unauthorized
4. WHEN the token is invalid, THE Auth_Middleware SHALL return 401 Unauthorized
5. WHEN the token is valid, THE Auth_Middleware SHALL decode the userId from the token
6. WHEN the token is valid, THE Auth_Middleware SHALL attach the userId to req.user
7. WHEN the token is valid, THE Auth_Middleware SHALL call next() to proceed to the route handler
8. THE Backend SHALL have a middleware/errorHandler.ts file for global error handling
9. WHEN an error occurs in any route, THE Error_Handler SHALL return a consistent error response format
10. THE Error_Response SHALL include success: false, error: { code, message }

---

### Requirement 7: User Registration and Login

**User Story**: As a user, I want to register an account and log in, so that I can access the application securely.

#### Acceptance Criteria

1. THE Backend SHALL have an auth.service.ts file with registration and login logic
2. WHEN POST /api/auth/register receives valid user data, THE System SHALL hash the password with bcrypt
3. WHEN POST /api/auth/register receives valid user data, THE System SHALL create a new User in the database
4. WHEN POST /api/auth/register succeeds, THE System SHALL sign a JWT_Token with the user's id
5. WHEN POST /api/auth/register succeeds, THE System SHALL set the JWT_Token as an httpOnly cookie named "token"
6. WHEN POST /api/auth/register succeeds, THE System SHALL return 201 Created with the user object (excluding passwordHash)
7. WHEN POST /api/auth/register receives a duplicate email, THE System SHALL return 409 Conflict
8. WHEN POST /api/auth/login receives valid credentials, THE System SHALL verify the password with bcrypt
9. WHEN POST /api/auth/login receives valid credentials, THE System SHALL sign a JWT_Token and set it as an httpOnly cookie
10. WHEN POST /api/auth/login receives valid credentials, THE System SHALL return 200 OK with the user object
11. WHEN POST /api/auth/login receives invalid credentials, THE System SHALL return 401 Unauthorized
12. WHEN GET /api/auth/me receives a valid JWT cookie, THE System SHALL return 200 OK with the authenticated user's data
13. WHEN GET /api/auth/me receives no JWT cookie or an invalid JWT cookie, THE System SHALL return 401 Unauthorized

---

### Requirement 8: Frontend Authentication State

**User Story**: As a user, I want the frontend to persist my authentication state, so that I remain logged in across page refreshes.

#### Acceptance Criteria

1. THE Frontend SHALL have a stores/authStore.ts file using Zustand
2. THE Auth_Store SHALL maintain currentUser state (User object or null)
3. THE Auth_Store SHALL have a login action that calls POST /api/auth/login
4. THE Auth_Store SHALL have a register action that calls POST /api/auth/register
5. THE Auth_Store SHALL have a logout action that clears the currentUser state
6. THE Auth_Store SHALL have a fetchMe action that calls GET /api/auth/me on app load
7. THE Frontend SHALL have a lib/api.ts file with an Axios instance
8. THE Axios_Instance SHALL be configured with withCredentials: true
9. THE Axios_Instance SHALL include the base URL from VITE_API_BASE_URL
10. THE Frontend SHALL have login and register pages that use the Auth_Store actions
11. WHEN a user successfully registers or logs in, THE Frontend SHALL store the user in Auth_Store
12. WHEN the app loads, THE Frontend SHALL call fetchMe to restore authentication state from the JWT cookie

---

### Requirement 9: Group Creation and Management

**User Story**: As a user, I want to create groups and manage their details, so that I can organize expense sharing with different sets of people.

#### Acceptance Criteria

1. THE Backend SHALL have a groups.service.ts file with group management logic
2. WHEN POST /api/groups receives valid group data from an authenticated user, THE System SHALL create a new Group with createdByUserId set to the authenticated user's id
3. WHEN a Group is created, THE System SHALL automatically add the creator as a GroupMember with role ADMIN
4. WHEN POST /api/groups succeeds, THE System SHALL return 201 Created with the group object
5. WHEN GET /api/groups receives a request from an authenticated user, THE System SHALL return all groups where the user is a member
6. WHEN GET /api/groups/:groupId receives a request from an authenticated user, THE System SHALL verify the user is a member of the group
7. WHEN the user is not a member of the group, THE System SHALL return 403 Forbidden
8. WHEN the user is a member of the group, THE System SHALL return 200 OK with the group details including all members
9. WHEN PATCH /api/groups/:groupId receives update data from an authenticated user, THE System SHALL verify the user has ADMIN role in the group
10. WHEN the user is not an ADMIN, THE System SHALL return 403 Forbidden
11. WHEN the user is an ADMIN, THE System SHALL update the group details and return 200 OK
12. WHEN DELETE /api/groups/:groupId receives a request from an ADMIN user, THE System SHALL set isArchived to true

---

### Requirement 10: Frontend Group Management UI

**User Story**: As a user, I want to view my groups, create new groups, and see group details, so that I can navigate my expense sharing activities.

#### Acceptance Criteria

1. THE Frontend SHALL have a pages/groups/GroupsListPage.tsx that displays all user's groups
2. THE Frontend SHALL have a pages/groups/GroupDetailPage.tsx that shows a single group's details
3. THE Frontend SHALL have a pages/groups/CreateGroupPage.tsx with a form for creating groups
4. THE Frontend SHALL have a hooks/useGroups.ts that uses React Query to fetch groups
5. WHEN the GroupsListPage loads, THE Frontend SHALL fetch all groups from GET /api/groups
6. WHEN a group card is clicked, THE Frontend SHALL navigate to the GroupDetailPage
7. WHEN the create group form is submitted, THE Frontend SHALL call POST /api/groups
8. WHEN group creation succeeds, THE Frontend SHALL navigate to the new group's detail page
9. THE GroupDetailPage SHALL display the group name, description, member list, and member count
10. THE GroupDetailPage SHALL show an "Edit" button only if the current user is an ADMIN
11. WHEN the Edit button is clicked, THE Frontend SHALL allow editing group name and description
12. WHEN the edit form is submitted, THE Frontend SHALL call PATCH /api/groups/:groupId

---

### Requirement 11: Add Members to Groups

**User Story**: As a group admin, I want to add both registered users by email and placeholder members by name, so that all participants can be included regardless of registration status.

#### Acceptance Criteria

1. THE Backend SHALL have a members.service.ts file with member management logic
2. WHEN POST /api/groups/:groupId/members receives a request with an email, THE System SHALL find the User by email
3. WHEN the User is found, THE System SHALL create a GroupMember with userId set to the User's id
4. WHEN POST /api/groups/:groupId/members receives a request with placeholderName, THE System SHALL create a GroupMember with userId null and placeholderName set
5. WHEN both userId and placeholderName are null, THE System SHALL return 400 Bad Request
6. WHEN both userId and placeholderName are non-null, THE System SHALL return 400 Bad Request (Placeholder_Invariant violation)
7. WHEN a GroupMember is created successfully, THE System SHALL return 201 Created with the member object
8. THE Backend SHALL validate the Placeholder_Invariant before saving any GroupMember
9. WHEN GET /api/groups/:groupId/members is called, THE System SHALL return all members with both real users and placeholders
10. THE Member_Response SHALL indicate isPlaceholder: true for placeholder members and isPlaceholder: false for real users
11. WHEN DELETE /api/groups/:groupId/members/:memberId is called by an ADMIN, THE System SHALL check if the member has any unsettled balances
12. WHEN the member has unsettled balances, THE System SHALL return 400 Bad Request
13. WHEN the member has zero balance, THE System SHALL delete the GroupMember record

---

### Requirement 12: Frontend Member Management UI

**User Story**: As a group member, I want to add new members using either email or name, so that I can include both registered and unregistered participants.

#### Acceptance Criteria

1. THE Frontend SHALL have a components/group/MemberList.tsx that displays all group members
2. THE Frontend SHALL have a modal for adding members with two tabs: "Registered User" and "Placeholder"
3. THE Registered_User_Tab SHALL have an email input field
4. THE Placeholder_Tab SHALL have name and phone input fields
5. WHEN the registered user form is submitted, THE Frontend SHALL call POST /api/groups/:groupId/members with email
6. WHEN the placeholder form is submitted, THE Frontend SHALL call POST /api/groups/:groupId/members with placeholderName and placeholderPhone
7. WHEN a member is added successfully, THE Frontend SHALL refresh the member list
8. THE MemberList SHALL display badges indicating "ADMIN" or "MEMBER" role
9. THE MemberList SHALL display badges indicating "Placeholder" for unregistered members
10. THE MemberList SHALL show a remove button for each member (only visible to ADMINs)
11. WHEN the remove button is clicked, THE Frontend SHALL call DELETE /api/groups/:groupId/members/:memberId
12. WHEN member removal fails due to unsettled balances, THE Frontend SHALL display an error message

---

### Requirement 13: Split Calculator Implementation

**User Story**: As a developer, I want split calculation algorithms for all four split types with correct rounding, so that expenses are divided accurately according to the Money_Invariant and Split_Invariant.

#### Acceptance Criteria

1. THE Backend SHALL have a services/splitCalculator.ts file
2. THE Split_Calculator SHALL export a calculateEqualSplit function
3. WHEN calculateEqualSplit receives 10000 paise and 3 members, THE Function SHALL return [3334, 3333, 3333]
4. THE First_Member SHALL receive the remainder paise according to the Rounding_Rule
5. THE Split_Calculator SHALL export a calculateExactSplit function
6. WHEN calculateExactSplit receives splits that sum to the total, THE Function SHALL return the splits unchanged
7. WHEN calculateExactSplit receives splits that do not sum to the total, THE Function SHALL throw an error
8. THE Split_Calculator SHALL export a calculatePercentageSplit function
9. WHEN calculatePercentageSplit receives percentages that sum to 100, THE Function SHALL calculate amounts and apply the Rounding_Rule
10. WHEN calculatePercentageSplit receives percentages that do not sum to 100, THE Function SHALL throw an error
11. THE Split_Calculator SHALL export a calculateSharesSplit function
12. WHEN calculateSharesSplit receives 1800000 paise and shares [2, 1, 2], THE Function SHALL return [720000, 360000, 720000]
13. THE Split_Calculator SHALL apply the Rounding_Rule for any remainder paise
14. THE Split_Calculator SHALL export a validateSplitInvariant function
15. WHEN validateSplitInvariant receives splits that sum to the total, THE Function SHALL return true
16. WHEN validateSplitInvariant receives splits that do not sum to the total, THE Function SHALL throw an error

---

### Requirement 14: Create Expenses with Four Split Types

**User Story**: As a user, I want to create expenses using any of the four split types (EQUAL, EXACT, PERCENTAGE, SHARES), so that I can accurately represent how costs should be divided.

#### Acceptance Criteria

1. THE Backend SHALL have an expenses.service.ts file with expense creation logic
2. WHEN POST /api/groups/:groupId/expenses receives an EQUAL split expense, THE System SHALL call calculateEqualSplit
3. WHEN POST /api/groups/:groupId/expenses receives an EXACT split expense, THE System SHALL call calculateExactSplit
4. WHEN POST /api/groups/:groupId/expenses receives a PERCENTAGE split expense, THE System SHALL call calculatePercentageSplit
5. WHEN POST /api/groups/:groupId/expenses receives a SHARES split expense, THE System SHALL call calculateSharesSplit
6. THE System SHALL create the Expense record and all ExpenseSplit records in a database transaction
7. THE System SHALL validate the Split_Invariant before committing the transaction
8. WHEN the Split_Invariant is violated, THE System SHALL rollback the transaction and return 400 Bad Request
9. WHEN the expense is created successfully, THE System SHALL return 201 Created with the expense and splits
10. WHEN GET /api/groups/:groupId/expenses is called, THE System SHALL return a paginated list of expenses
11. WHEN GET /api/groups/:groupId/expenses/:expenseId is called, THE System SHALL return the expense with all splits including member names
12. THE Expense_Response SHALL include the paidByMemberName and each split SHALL include memberName

---

### Requirement 15: Frontend Expense Creation UI

**User Story**: As a user, I want to create expenses with a dynamic form that adapts to the selected split type, so that I can easily input split details for any division method.

#### Acceptance Criteria

1. THE Frontend SHALL have a pages/expenses/CreateExpensePage.tsx with an expense form
2. THE Expense_Form SHALL have fields for description, total amount (in rupees), paid by (member selector), split type (dropdown), and date
3. WHEN the split type is EQUAL, THE Form SHALL display a multi-select for choosing members
4. WHEN the split type is EXACT, THE Form SHALL display amount input fields for each selected member
5. WHEN the split type is PERCENTAGE, THE Form SHALL display percentage input fields for each selected member
6. WHEN the split type is SHARES, THE Form SHALL display integer share input fields for each selected member
7. THE Form SHALL convert the rupee amount to paise before submitting
8. WHEN the form is submitted, THE Frontend SHALL call POST /api/groups/:groupId/expenses
9. THE Frontend SHALL validate that EXACT splits sum to the total before submitting
10. THE Frontend SHALL validate that PERCENTAGE splits sum to 100 before submitting
11. WHEN expense creation succeeds, THE Frontend SHALL navigate to the group expenses list
12. THE Frontend SHALL have a pages/expenses/ExpenseDetailPage.tsx showing expense details and all splits

---

### Requirement 16: Balance Calculation Engine

**User Story**: As a developer, I want a balance engine that calculates net balances from expenses and settlements, so that users can see who owes whom.

#### Acceptance Criteria

1. THE Backend SHALL have a services/balanceEngine.ts file
2. THE Balance_Engine SHALL export a calculateNetBalances function
3. WHEN calculateNetBalances is called for a group, THE Function SHALL fetch all expenses and settlements for that group
4. FOR EACH expense split, THE Balance_Engine SHALL calculate debt from the split member to the payer
5. WHEN the split member is the payer, THE Balance_Engine SHALL not create a debt entry
6. FOR EACH settlement, THE Balance_Engine SHALL subtract the settlement amount from the corresponding debt
7. THE Balance_Engine SHALL aggregate all debts between each pair of members
8. THE Balance_Engine SHALL return an array of pairwise balances with fromMemberId, toMemberId, and amountPaise
9. WHEN a member has zero net balance with another member, THE Balance_Engine SHALL exclude that pair from the result
10. THE Balance_Engine SHALL ensure all returned amounts are positive integers in paise

---

### Requirement 17: Debt Minimization Algorithm

**User Story**: As a user, I want the system to minimize the number of transfers needed to settle all debts, so that settling up is as simple as possible.

#### Acceptance Criteria

1. THE Balance_Engine SHALL export a minimizeTransfers function
2. WHEN minimizeTransfers receives pairwise balances, THE Function SHALL calculate each member's net position (total credits minus total debits)
3. THE Function SHALL create a list of creditors (positive net position) and debtors (negative net position)
4. THE Function SHALL implement the greedy algorithm: repeatedly match the maximum creditor with the maximum debtor
5. FOR EACH match, THE Function SHALL create a transfer for the minimum of the creditor's balance and debtor's balance
6. THE Function SHALL update the creditor and debtor net positions after each match
7. WHEN a member's net position reaches zero, THE Function SHALL remove them from the active lists
8. THE Function SHALL repeat until both creditor and debtor lists are empty
9. THE Function SHALL return an array of optimized transfers with fromMemberId, toMemberId, and amountPaise
10. THE Sum of optimized transfer amounts SHALL equal the sum of raw balance amounts (Money_Invariant preserved)
11. THE Number of optimized transfers SHALL be less than or equal to the number of raw balances

---

### Requirement 18: Balance API Endpoint

**User Story**: As a user, I want to view both the raw pairwise balances and the optimized transfer list, so that I understand the debt structure and know the simplest way to settle up.

#### Acceptance Criteria

1. THE Backend SHALL have a balances.controller.ts file
2. WHEN GET /api/groups/:groupId/balances is called by a group member, THE System SHALL call calculateNetBalances
3. THE System SHALL call minimizeTransfers on the raw balances
4. THE System SHALL fetch member names for all members in both balance lists
5. THE Response SHALL include a rawBalances array with fromMemberId, fromMemberName, toMemberId, toMemberName, amountPaise
6. THE Response SHALL include an optimizedTransfers array with fromMemberId, fromMemberName, toMemberId, toMemberName, amountPaise
7. THE Response SHALL include a summary with totalRawTransfers count and totalOptimizedTransfers count
8. THE Response SHALL include a savingsCount showing how many transfers were eliminated
9. WHEN the user is not a member of the group, THE System SHALL return 403 Forbidden
10. THE System SHALL return 200 OK with both balance arrays

---

### Requirement 19: Frontend Balance Display UI

**User Story**: As a user, I want to see the optimized transfers with a toggle to view raw balances, so that I can choose the simplest settlement path or investigate the detailed breakdown.

#### Acceptance Criteria

1. THE Frontend SHALL have a pages/balances/BalancesPage.tsx that displays balances for a group
2. WHEN the BalancesPage loads, THE Frontend SHALL call GET /api/groups/:groupId/balances
3. THE Page SHALL display the optimizedTransfers list by default
4. THE Page SHALL have a toggle or tab to switch to the rawBalances view
5. EACH transfer SHALL be displayed as a card showing "X pays Y ₹Z.ZZ"
6. THE Frontend SHALL use the formatCurrency utility to display amounts in rupees
7. THE Page SHALL display the savings count prominently (e.g., "Minimized from 5 transfers to 3")
8. THE Page SHALL have a "Settle Up" button next to each optimized transfer
9. WHEN the "Settle Up" button is clicked, THE Frontend SHALL open a settlement form modal pre-filled with the transfer details
10. THE Frontend SHALL have a hooks/useBalances.ts that uses React Query to fetch balances

---

### Requirement 20: Record Manual Settlements

**User Story**: As a user, I want to record settlements when I pay another member, so that the system tracks debt reductions and updates balances.

#### Acceptance Criteria

1. THE Backend SHALL have a settlements.service.ts file with settlement creation logic
2. WHEN POST /api/groups/:groupId/settlements receives valid settlement data, THE System SHALL validate that fromMemberId and toMemberId are different
3. WHEN fromMemberId equals toMemberId, THE System SHALL return 400 Bad Request
4. WHEN amountPaise is less than or equal to zero, THE System SHALL return 400 Bad Request
5. WHEN the settlement data is valid, THE System SHALL create a Settlement record with method MANUAL
6. THE System SHALL set settledAt to the current timestamp
7. WHEN settlement creation succeeds, THE System SHALL return 201 Created with the settlement object
8. WHEN GET /api/groups/:groupId/settlements is called, THE System SHALL return all settlements for the group ordered by settledAt descending
9. THE Settlement_Response SHALL include fromMemberName and toMemberName
10. THE System SHALL ensure the requesting user is a member of the group before allowing settlement operations

---

### Requirement 21: Frontend Settlement UI

**User Story**: As a user, I want to record settlements via a modal form and view settlement history, so that I can track when debts were paid.

#### Acceptance Criteria

1. THE Frontend SHALL have a components/balance/SettlementForm.tsx modal component
2. THE Settlement_Form SHALL have fields for: from member (dropdown), to member (dropdown), amount (in rupees), and note (optional)
3. WHEN the form is opened from a "Settle Up" button, THE Form SHALL be pre-filled with fromMemberId, toMemberId, and amountPaise from the transfer
4. THE Form SHALL convert the rupee amount to paise before submitting
5. WHEN the form is submitted, THE Frontend SHALL call POST /api/groups/:groupId/settlements
6. WHEN settlement creation succeeds, THE Frontend SHALL close the modal and refresh the balances
7. THE Frontend SHALL have a pages/settlements/SettlementsPage.tsx showing settlement history
8. THE Settlements_Page SHALL display each settlement as a card with "X paid Y ₹Z.ZZ on DATE"
9. WHEN the note field is non-empty, THE Settlement_Card SHALL display the note
10. THE Frontend SHALL have a hooks/useSettlements.ts that uses React Query to fetch settlements

---

### Requirement 22: CORS Configuration

**User Story**: As a developer, I want the backend to accept requests from the frontend with credentials, so that JWT cookies work correctly in cross-origin requests.

#### Acceptance Criteria

1. THE Backend SHALL use the cors middleware package
2. THE CORS_Configuration SHALL set origin to the FRONTEND_URL from environment variables
3. THE CORS_Configuration SHALL set credentials to true
4. WHEN NODE_ENV is "development", THE CORS SHALL accept requests from http://localhost:5173
5. WHEN NODE_ENV is "production", THE CORS SHALL accept requests from the production frontend URL
6. THE Backend SHALL use cookie-parser middleware to parse cookies from requests
7. THE Express_App SHALL register CORS middleware before all routes
8. THE Express_App SHALL register cookie-parser middleware before all routes

---

### Requirement 23: Integration Testing with Seed Data

**User Story**: As a developer, I want to verify that all features work end-to-end with the seed data, so that I can confirm the implementation is correct.

#### Acceptance Criteria

1. WHEN "npm run dev" is executed from the root, THE System SHALL start both servers without errors
2. WHEN the database is seeded, THE System SHALL contain 3 users, 2 groups, and multiple expenses with all 4 split types
3. WHEN POST /api/auth/register is called with new user data, THE System SHALL return 201 Created and set an httpOnly cookie
4. WHEN GET /api/auth/me is called with a valid cookie, THE System SHALL return 200 OK with user data
5. WHEN GET /api/auth/me is called without a cookie, THE System SHALL return 401 Unauthorized
6. WHEN POST /api/groups is called by an authenticated user, THE System SHALL create the group and auto-add the creator as ADMIN
7. WHEN POST /api/groups/:groupId/members is called with only placeholderName, THE System SHALL create a placeholder member successfully
8. WHEN POST /api/groups/:groupId/members is called with both userId and placeholderName, THE System SHALL return 400 Bad Request
9. WHEN an EQUAL split expense is created, THE Split_Calculator SHALL apply the Rounding_Rule correctly
10. WHEN a PERCENTAGE split expense is created with percentages not summing to 100, THE System SHALL return 400 Bad Request
11. WHEN a SHARES split expense is created with shares [2, 1, 2] and total 1800000 paise, THE Splits SHALL be [720000, 360000, 720000]
12. WHEN GET /api/groups/:groupId/balances is called, THE Response SHALL include both rawBalances and optimizedTransfers
13. WHEN a settlement is recorded, THE System SHALL create the Settlement record successfully
14. WHEN balances are recalculated after a settlement, THE Debt amounts SHALL be reduced accordingly
15. FOR ALL expenses in the database, THE Split_Invariant SHALL hold (verified via Prisma Studio or SQL query)
16. THE Database SHALL contain NO Float columns (all money stored as Int in paise)

---

