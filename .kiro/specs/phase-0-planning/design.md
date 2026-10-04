# Design Document: Phase 0 - Project Planning & Schema Design

## Overview

Phase 0 establishes the foundational planning documents for Splitwise 2.0, a full-stack expense-splitting application. This phase produces four critical documentation artifacts that serve as ground truth for all subsequent development:

1. **SCHEMA.md** - Complete Prisma database schema
2. **API_CONTRACT.md** - Comprehensive REST API specification
3. **FOLDER_STRUCTURE.md** - Monorepo directory structure
4. **ENV_TEMPLATE.md** - Environment variable documentation

These documents must precisely specify the data models, API contracts, code organization, and configuration requirements needed to build a production-ready expense management system supporting multiple split algorithms, debt optimization, placeholder members, AI integration, and strict integer-based money handling.

### Design Goals

- **Completeness**: Every model, endpoint, folder, and environment variable required for implementation must be documented
- **Precision**: All specifications must be unambiguous and implementation-ready
- **Consistency**: Terminology, naming conventions, and invariants must align across all documents
- **Traceability**: Design decisions must map back to requirements for verification
- **Constraint Documentation**: Critical invariants (Money_Invariant, Split_Invariant, Placeholder_Invariant) must be explicitly stated

### Non-Goals

- Implementation code (deferred to later phases)
- UI/UX design specifications
- Deployment infrastructure details
- Performance optimization strategies

## Architecture

### Document Structure Strategy

The four planning documents form a hierarchical specification system:

```
SCHEMA.md (Data Layer)
    ↓ defines models used by
API_CONTRACT.md (Interface Layer)
    ↓ accessed by code in
FOLDER_STRUCTURE.md (Implementation Layer)
    ↓ configured via
ENV_TEMPLATE.md (Configuration Layer)
```

Each document has a distinct responsibility:

- **SCHEMA.md**: Single source of truth for data structure, relationships, and data-level invariants
- **API_CONTRACT.md**: Contract between frontend and backend, defining all HTTP interfaces
- **FOLDER_STRUCTURE.md**: Code organization blueprint showing where implementation logic resides
- **ENV_TEMPLATE.md**: Configuration surface area for deployment environments

### Cross-Document Consistency Rules

1. **Naming Consistency**: Model names in SCHEMA.md must match entity names in API_CONTRACT.md (e.g., `Expense` model → `/api/expenses` endpoints)
2. **Type Consistency**: Field types in SCHEMA.md must align with JSON schema types in API_CONTRACT.md (e.g., `Int` → `number`)
3. **Service Mapping**: Services mentioned in FOLDER_STRUCTURE.md must implement logic described in API_CONTRACT.md
4. **Environment Variables**: Variables in ENV_TEMPLATE.md must match those referenced in code structure comments

### Invariant Documentation Strategy

Three critical invariants must be documented across multiple documents:

1. **Money_Invariant** ("All money operations use integer paise only")
   - SCHEMA.md: Field type specifications
   - API_CONTRACT.md: Example amounts in paise
   - FOLDER_STRUCTURE.md: moneyUtils.ts purpose

2. **Split_Invariant** ("Sum of expense splits equals expense total")
   - SCHEMA.md: Constraint documentation
   - API_CONTRACT.md: Validation error responses
   - FOLDER_STRUCTURE.md: splitCalculator validation function

3. **Placeholder_Invariant** ("GroupMember has exactly one of userId OR placeholderName")
   - SCHEMA.md: Nullable field documentation
   - API_CONTRACT.md: Member endpoint validation
   - FOLDER_STRUCTURE.md: Service layer validation

## Components and Interfaces

### Component 1: SCHEMA.md Document

**Purpose**: Define complete Prisma schema with all models, relationships, and constraints.

**Structure**:
```
1. Header explaining Prisma schema purpose
2. Money_Invariant documentation
3. Core Models section:
   - User (authentication fields)
   - Group (basic group info)
   - GroupMember (with Placeholder_Invariant)
   - Expense (with split type enum)
   - ExpenseSplit (individual member shares)
   - Settlement (manual payments)
   - Notification (user alerts)
4. Invariant Documentation section:
   - Money_Invariant explanation
   - Split_Invariant explanation
   - Rounding_Rule algorithm
   - Placeholder_Invariant explanation
5. Debt_Minimization algorithm description
```

**Key Design Decisions**:

- **Integer-Only Amounts**: All `amount` fields use Prisma `Int` type to store paise, never `Float` or `Decimal`
- **Nullable Foreign Keys**: `GroupMember.userId` is nullable to support placeholder members
- **Split Type Enum**: Define `EQUAL`, `EXACT`, `PERCENTAGE`, `SHARES` as enum values
- **Explicit Invariants**: Document Money_Invariant, Split_Invariant, and Placeholder_Invariant as comments in schema
- **Rounding Algorithm**: Specify that first member receives remainder paise (Rs. 100 ÷ 3 → [34, 33, 33])

**Model Relationships**:
- User 1:N GroupMember (user can join many groups)
- Group 1:N GroupMember (group has many members)
- Group 1:N Expense (group has many expenses)
- Expense 1:N ExpenseSplit (expense splits to many members)
- GroupMember 1:N ExpenseSplit (member appears in many splits)
- GroupMember 1:N Settlement (from) and 1:N Settlement (to)

### Component 2: API_CONTRACT.md Document

**Purpose**: Specify all REST API endpoints with request/response schemas.

**Structure**:
```
1. Header explaining API versioning and base URL
2. Authentication section:
   - POST /api/auth/register
   - POST /api/auth/login
   - POST /api/auth/logout
   - GET /api/auth/me
3. Groups section:
   - POST /api/groups (create)
   - GET /api/groups (list)
   - GET /api/groups/:id (read)
   - PUT /api/groups/:id (update)
   - DELETE /api/groups/:id (delete)
4. Members section:
   - POST /api/groups/:groupId/members (add)
   - DELETE /api/groups/:groupId/members/:memberId (remove)
5. Expenses section:
   - POST /api/groups/:groupId/expenses (create with split examples)
   - GET /api/groups/:groupId/expenses (list)
   - GET /api/expenses/:id (read)
   - PUT /api/expenses/:id (update)
   - DELETE /api/expenses/:id (delete)
6. Balances section:
   - GET /api/groups/:groupId/balances (raw + optimized)
7. Settlements section:
   - POST /api/groups/:groupId/settlements (record payment)
   - GET /api/groups/:groupId/settlements (list)
8. AI section:
   - POST /api/ai/parse-expense (NLP parsing)
   - POST /api/ai/scan-bill (image upload)
9. Notifications section:
   - GET /api/notifications (list)
   - PUT /api/notifications/:id/read (mark read)
```

**Key Design Decisions**:

- **RESTful Conventions**: Use standard HTTP methods (GET, POST, PUT, DELETE) with appropriate status codes
- **Nested Resources**: Member and expense endpoints nest under `/api/groups/:groupId` to enforce group context
- **Authentication Headers**: Specify `Authorization: Bearer <token>` requirement for protected endpoints
- **Split Algorithm Examples**: Provide complete request/response examples for EQUAL, EXACT, PERCENTAGE, and SHARES splits
- **Paise Representation**: All amount fields in JSON use integer paise (e.g., `"amount": 10050` for ₹100.50)
- **Balance Optimization**: `/balances` endpoint returns both `rawBalances` (pairwise) and `optimizedTransfers` (minimized) arrays
- **AI No-Auto-Save**: Explicitly document that `/parse-expense` and `/scan-bill` return pre-filled data for confirmation only, never auto-save
- **Error Responses**: Standardize error format with `{ "error": "message", "details": {} }` structure

**Validation Rules**:
- EXACT split must provide amounts that sum to total
- PERCENTAGE split must provide percentages that sum to 100
- SHARES split must provide positive integer shares
- Placeholder member endpoints must validate Placeholder_Invariant
- AI endpoints must validate authentication

### Component 3: FOLDER_STRUCTURE.md Document

**Purpose**: Define monorepo directory tree with clear separation of concerns.

**Structure**:
```
splitwise-2.0/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.ts
│   │   │   ├── groupController.ts
│   │   │   ├── expenseController.ts
│   │   │   ├── balanceController.ts
│   │   │   ├── settlementController.ts
│   │   │   ├── aiController.ts
│   │   │   └── notificationController.ts
│   │   ├── services/
│   │   │   ├── splitCalculator.ts
│   │   │   ├── balanceEngine.ts
│   │   │   ├── aiService.ts
│   │   │   └── notificationService.ts
│   │   ├── routes/
│   │   │   ├── authRoutes.ts
│   │   │   ├── groupRoutes.ts
│   │   │   ├── expenseRoutes.ts
│   │   │   ├── balanceRoutes.ts
│   │   │   ├── settlementRoutes.ts
│   │   │   ├── aiRoutes.ts
│   │   │   └── notificationRoutes.ts
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validateRequest.ts
│   │   ├── utils/
│   │   │   ├── moneyUtils.ts
│   │   │   └── validation.ts
│   │   ├── prisma/
│   │   │   └── client.ts
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── groups/
│   │   │   ├── expenses/
│   │   │   ├── balances/
│   │   │   ├── auth/
│   │   │   └── common/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── GroupDetailPage.tsx
│   │   │   └── ExpenseFormPage.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useGroups.ts
│   │   │   └── useExpenses.ts
│   │   ├── services/
│   │   │   ├── apiClient.ts
│   │   │   ├── authService.ts
│   │   │   ├── groupService.ts
│   │   │   └── expenseService.ts
│   │   ├── utils/
│   │   │   ├── moneyFormat.ts
│   │   │   └── dateFormat.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

**Key Design Decisions**:

- **Monorepo Structure**: Separate `backend/` and `frontend/` packages for clear deployment boundaries
- **Service Layer Separation**: Extract business logic into services (splitCalculator, balanceEngine, aiService)
- **Controller-Service Pattern**: Controllers handle HTTP concerns, services implement domain logic
- **Shared Utilities**: `moneyUtils.ts` provides paiseToRupees and rupeesToPaise converters
- **Middleware Stack**: Authentication, validation, and error handling as reusable middleware
- **Prisma Client Singleton**: Centralized Prisma client instance in `prisma/client.ts`
- **Frontend Service Layer**: API client abstraction isolates HTTP logic from components

**Critical Service Specifications**:

**splitCalculator.ts**:
```typescript
export function calculateEqualSplit(total: number, memberCount: number): number[]
export function calculateExactSplit(amounts: number[]): { valid: boolean, amounts: number[] }
export function calculatePercentageSplit(total: number, percentages: number[]): number[]
export function calculateSharesSplit(total: number, shares: number[]): number[]
export function validateSplitInvariant(total: number, splits: number[]): boolean
```

**balanceEngine.ts**:
```typescript
export function calculateNetBalances(expenses: Expense[], settlements: Settlement[]): Balance[]
export function minimizeTransfers(balances: Balance[]): Transfer[]
```

**aiService.ts**:
```typescript
export async function parseExpenseFromText(text: string): Promise<ExpenseData>
export async function scanBillFromImage(imageBuffer: Buffer): Promise<ExpenseData>
// Uses claude-sonnet-4-6 model
// Returns data in paise following Money_Invariant
```

**moneyUtils.ts**:
```typescript
export function paiseToRupees(paise: number): string // "100.50"
export function rupeesToPaise(rupees: string): number // 10050
```

### Component 4: ENV_TEMPLATE.md Document

**Purpose**: Document all required environment variables for configuration.

**Structure**:
```
1. Header explaining environment configuration
2. Backend Variables section:
   - DATABASE_URL (PostgreSQL connection string)
   - JWT_SECRET (token signing key)
   - JWT_EXPIRES_IN (token expiry duration)
   - ANTHROPIC_API_KEY (Claude API key)
   - PORT (server port)
   - FRONTEND_URL (CORS whitelist)
   - NODE_ENV (development/production)
3. Frontend Variables section:
   - VITE_API_BASE_URL (backend API endpoint)
4. File Locations section:
   - backend/.env
   - frontend/.env
   - .gitignore reminder
5. Example Values section:
   - Complete .env.example templates
```

**Key Design Decisions**:

- **VITE_ Prefix**: All frontend environment variables must use `VITE_` prefix per Vite requirements
- **Separate .env Files**: Backend and frontend each have their own `.env` file at package root
- **Security Notes**: Emphasize `.env` must be in `.gitignore`, use `.env.example` for templates
- **Required vs Optional**: Mark JWT_EXPIRES_IN as optional (defaults to "24h"), all others required
- **Connection String Format**: Provide example PostgreSQL URL format
- **CORS Configuration**: Explain FRONTEND_URL purpose for security

**Example Values**:
```env
# backend/.env
DATABASE_URL="postgresql://user:password@localhost:5432/splitwise"
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="24h"
ANTHROPIC_API_KEY="sk-ant-api-key-here"
PORT=3000
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"

# frontend/.env
VITE_API_BASE_URL="http://localhost:3000/api"
```

## Data Models

### Core Entity Models (from SCHEMA.md)

#### User
```prisma
model User {
  id           String        @id @default(cuid())
  email        String        @unique
  passwordHash String
  name         String
  phone        String?
  createdAt    DateTime      @default(now())
  memberships  GroupMember[]
  notifications Notification[]
}
```

**Design Rationale**: Standard authentication model with optional phone for future features.

#### Group
```prisma
model Group {
  id          String        @id @default(cuid())
  name        String
  description String?
  creatorId   String
  creator     User          @relation(fields: [creatorId], references: [id])
  createdAt   DateTime      @default(now())
  members     GroupMember[]
  expenses    Expense[]
}
```

**Design Rationale**: Track creator for permissions, description optional for simple groups.

#### GroupMember
```prisma
model GroupMember {
  id                String         @id @default(cuid())
  groupId           String
  group             Group          @relation(fields: [groupId], references: [id])
  userId            String?
  user              User?          @relation(fields: [userId], references: [id])
  placeholderName   String?
  placeholderPhone  String?
  placeholderEmail  String?
  joinedAt          DateTime       @default(now())
  expenseSplits     ExpenseSplit[]
  settlementsFrom   Settlement[]   @relation("from")
  settlementsTo     Settlement[]   @relation("to")
  
  // Placeholder_Invariant: Exactly one of userId OR placeholderName must be non-null
}
```

**Design Rationale**: Nullable `userId` and `placeholderName` enable unregistered user support while maintaining referential integrity for registered users. Placeholder_Invariant enforced at service layer.

#### Expense
```prisma
enum SplitType {
  EQUAL
  EXACT
  PERCENTAGE
  SHARES
}

model Expense {
  id          String         @id @default(cuid())
  groupId     String
  group       Group          @relation(fields: [groupId], references: [id])
  payerId     String
  payer       GroupMember    @relation(fields: [payerId], references: [id])
  amount      Int            // Money_Invariant: Integer paise only
  description String
  date        DateTime       @default(now())
  splitType   SplitType
  splits      ExpenseSplit[]
  createdAt   DateTime       @default(now())
}
```

**Design Rationale**: `amount` as `Int` enforces Money_Invariant. `splitType` enum enables algorithm selection.

#### ExpenseSplit
```prisma
model ExpenseSplit {
  id        String      @id @default(cuid())
  expenseId String
  expense   Expense     @relation(fields: [expenseId], references: [id])
  memberId  String
  member    GroupMember @relation(fields: [memberId], references: [id])
  amount    Int         // Money_Invariant: Integer paise only
  share     Float?      // For PERCENTAGE (0-100) or SHARES (integer as float)
}
```

**Design Rationale**: `amount` stores final calculated paise. `share` stores input percentage/shares for audit trail. Split_Invariant: sum of all `amount` values for an expense must equal `Expense.amount`.

#### Settlement
```prisma
model Settlement {
  id        String      @id @default(cuid())
  groupId   String
  fromId    String
  from      GroupMember @relation("from", fields: [fromId], references: [id])
  toId      String
  to        GroupMember @relation("to", fields: [toId], references: [id])
  amount    Int         // Money_Invariant: Integer paise only
  date      DateTime    @default(now())
  note      String?
}
```

**Design Rationale**: Records manual payments between members to adjust balances. Self-referential relations on GroupMember.

#### Notification
```prisma
model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

**Design Rationale**: Simple notification model for future expansion (expense added, payment received, etc.).

### API Data Transfer Objects (from API_CONTRACT.md)

#### Split Algorithm Request Examples

**EQUAL Split**:
```json
POST /api/groups/:groupId/expenses
{
  "payerId": "member_id",
  "amount": 30000,
  "description": "Dinner",
  "date": "2024-01-15",
  "splitType": "EQUAL",
  "memberIds": ["member1", "member2", "member3"]
}
```

**EXACT Split**:
```json
{
  "payerId": "member_id",
  "amount": 30000,
  "description": "Groceries",
  "splitType": "EXACT",
  "splits": [
    { "memberId": "member1", "amount": 15000 },
    { "memberId": "member2", "amount": 10000 },
    { "memberId": "member3", "amount": 5000 }
  ]
}
```

**PERCENTAGE Split**:
```json
{
  "payerId": "member_id",
  "amount": 30000,
  "description": "Rent",
  "splitType": "PERCENTAGE",
  "splits": [
    { "memberId": "member1", "percentage": 50 },
    { "memberId": "member2", "percentage": 30 },
    { "memberId": "member3", "percentage": 20 }
  ]
}
```

**SHARES Split**:
```json
{
  "payerId": "member_id",
  "amount": 30000,
  "description": "Pizza",
  "splitType": "SHARES",
  "splits": [
    { "memberId": "member1", "shares": 2 },
    { "memberId": "member2", "shares": 1 },
    { "memberId": "member3", "shares": 1 }
  ]
}
```

#### Balance Response Example

```json
GET /api/groups/:groupId/balances
{
  "rawBalances": [
    { "from": "member1", "to": "member2", "amount": 5000 },
    { "from": "member1", "to": "member3", "amount": 3000 },
    { "from": "member2", "to": "member3", "amount": 2000 }
  ],
  "optimizedTransfers": [
    { "from": "member1", "to": "member3", "amount": 5000 },
    { "from": "member1", "to": "member2", "amount": 3000 }
  ]
}
```

**Design Rationale**: Optimized transfers reduce 3 transactions to 2 while maintaining net balances.

#### AI Endpoint Response Example

```json
POST /api/ai/parse-expense
Request: { "text": "Split dinner bill of 450 rupees between me, Alice, and Bob" }
Response: {
  "amount": 45000,
  "description": "dinner bill",
  "participants": ["Alice", "Bob"],
  "confidence": 0.95,
  "note": "This data is for confirmation only. Review and save manually."
}
```

**Design Rationale**: Returns pre-filled data object with explicit note that no auto-save occurs.

### Configuration Data (from ENV_TEMPLATE.md)

**Backend Environment Schema**:
```typescript
interface BackendEnv {
  DATABASE_URL: string;           // Required
  JWT_SECRET: string;             // Required
  JWT_EXPIRES_IN?: string;        // Optional, default "24h"
  ANTHROPIC_API_KEY: string;      // Required
  PORT?: number;                  // Optional, default 3000
  FRONTEND_URL: string;           // Required for CORS
  NODE_ENV: 'development' | 'production'; // Required
}
```

**Frontend Environment Schema**:
```typescript
interface FrontendEnv {
  VITE_API_BASE_URL: string;      // Required, must use VITE_ prefix
}
```

**Design Rationale**: TypeScript interfaces provide type-safe access to environment variables with clear required/optional distinctions.

## Error Handling

### Document Validation Strategy

Each planning document must be validated for completeness and consistency before moving to implementation:

#### SCHEMA.md Validation

**Completeness Checks**:
- All 7 models defined (User, Group, GroupMember, Expense, ExpenseSplit, Settlement, Notification)
- All relationships declared with correct cardinality
- All `amount` fields use `Int` type (Money_Invariant)
- SplitType enum includes all 4 values

**Invariant Checks**:
- Money_Invariant documented in comments
- Split_Invariant documented with example
- Placeholder_Invariant documented with constraint explanation
- Rounding_Rule algorithm specified

**Error Prevention**: Use Prisma schema validation (`npx prisma validate`) to catch syntax errors.

#### API_CONTRACT.md Validation

**Completeness Checks**:
- All 9 endpoint categories documented
- Each endpoint specifies method, auth requirement, request schema, response schema
- All 4 split algorithm examples provided
- Both raw and optimized balance formats documented
- AI endpoints explicitly state no-auto-save policy

**Consistency Checks**:
- Endpoint paths match model names (e.g., `/expenses` for `Expense` model)
- Amount fields use integer paise in examples
- Error response format standardized
- Placeholder member validation documented

**Error Prevention**: Manual review checklist ensures all requirements mapped to endpoints.

#### FOLDER_STRUCTURE.md Validation

**Completeness Checks**:
- Backend structure shows controllers, services, routes, middleware, utils, prisma
- Frontend structure shows components, pages, hooks, services, utils
- All service files mentioned in requirements exist in tree
- Configuration files (tsconfig, package.json, .env.example) present

**Consistency Checks**:
- Service names in tree match those referenced in API_CONTRACT.md
- Utility files (moneyUtils.ts) present in both backend and frontend
- Prisma schema location matches backend/prisma/schema.prisma

**Error Prevention**: Automated script to verify folder tree against requirement checklist.

#### ENV_TEMPLATE.md Validation

**Completeness Checks**:
- All 8 backend variables documented (DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, ANTHROPIC_API_KEY, PORT, FRONTEND_URL, NODE_ENV)
- VITE_API_BASE_URL frontend variable documented
- File locations specified (backend/.env, frontend/.env)
- .gitignore reminder included

**Consistency Checks**:
- Frontend variables use VITE_ prefix
- Example values provided for all variables
- Security notes emphasize secret management

**Error Prevention**: Environment variable parser validates .env.example format.

### Cross-Document Consistency Validation

**Model-Endpoint Alignment**:
- For each model in SCHEMA.md, verify corresponding endpoints exist in API_CONTRACT.md
- For each endpoint in API_CONTRACT.md, verify model exists in SCHEMA.md

**Service-Endpoint Alignment**:
- For each service in FOLDER_STRUCTURE.md, verify endpoints using that service exist in API_CONTRACT.md
- For each endpoint in API_CONTRACT.md requiring business logic, verify service exists in FOLDER_STRUCTURE.md

**Environment-Code Alignment**:
- For each environment variable in ENV_TEMPLATE.md, verify usage documented in FOLDER_STRUCTURE.md or API_CONTRACT.md
- For each external dependency (Anthropic API), verify environment variable exists

### Error Communication

**Validation Error Format**:
```
[DOCUMENT] [CATEGORY] [SEVERITY]: Description
Example:
[SCHEMA.md] [Completeness] [ERROR]: User model missing passwordHash field (Requirement 1.1)
[API_CONTRACT.md] [Consistency] [WARNING]: Amount field example uses float instead of paise integer
[FOLDER_STRUCTURE.md] [Completeness] [ERROR]: splitCalculator.ts not shown in services directory (Requirement 5.9)
```

**Severity Levels**:
- **ERROR**: Violates explicit requirement, blocks implementation
- **WARNING**: Inconsistency or ambiguity, should be resolved
- **INFO**: Suggestion for improvement, not blocking

## Testing Strategy

### Testing Approach for Planning Documents

Phase 0 produces documentation artifacts, not executable code. Therefore, traditional unit tests and property-based tests do not apply. Instead, verification focuses on **document completeness**, **requirement traceability**, and **cross-document consistency**.

### Why Property-Based Testing Does Not Apply

Property-based testing (PBT) is designed to verify universal properties of executable code by running tests across many generated inputs. Since Phase 0 produces only Markdown documentation files (SCHEMA.md, API_CONTRACT.md, FOLDER_STRUCTURE.md, ENV_TEMPLATE.md), there is no code to execute and no functions to test.

**PBT would be appropriate for**:
- Testing the split calculator algorithm implementation (Phase N)
- Testing the debt minimization algorithm implementation (Phase N)
- Testing money conversion utilities (Phase N)

**For Phase 0 planning documents**, we instead use:
- **Requirement traceability matrices** to ensure all acceptance criteria map to document sections
- **Manual review checklists** to verify completeness
- **Automated linters** to check document structure and formatting
- **Cross-reference validation** to ensure consistency across documents

### Verification Methods

#### 1. Requirement Traceability Matrix

Create a mapping from each acceptance criterion to document sections:

| Requirement | Acceptance Criterion | Document Section | Status |
|-------------|---------------------|------------------|--------|
| 1.1 | User model authentication fields | SCHEMA.md → User model | ✓ |
| 1.2 | Group model definition | SCHEMA.md → Group model | ✓ |
| 2.1 | Auth endpoints defined | API_CONTRACT.md → Authentication | ✓ |
| ... | ... | ... | ... |

**Success Criteria**: All 81 acceptance criteria (from 9 requirements) must have corresponding document sections marked complete.

#### 2. Document Completeness Checklist

**SCHEMA.md Checklist**:
- [ ] User model with email, passwordHash, name, phone fields
- [ ] Group model with name, description, creator, createdAt fields
- [ ] GroupMember model with userId (nullable), placeholderName (nullable)
- [ ] Expense model with payer, group, amount (Int), description, date, splitType
- [ ] ExpenseSplit model with member, amount (Int), share
- [ ] Settlement model with from, to, amount (Int), date
- [ ] Notification model with user, message, read, createdAt
- [ ] Money_Invariant documented
- [ ] Split_Invariant documented with example
- [ ] Rounding_Rule algorithm specified (first member gets remainder)
- [ ] Placeholder_Invariant documented
- [ ] Debt_Minimization algorithm described

**API_CONTRACT.md Checklist**:
- [ ] POST /api/auth/register endpoint
- [ ] POST /api/auth/login endpoint
- [ ] POST /api/auth/logout endpoint
- [ ] GET /api/auth/me endpoint
- [ ] POST /api/groups endpoint
- [ ] GET /api/groups endpoint (list)
- [ ] GET /api/groups/:id endpoint
- [ ] PUT /api/groups/:id endpoint
- [ ] DELETE /api/groups/:id endpoint
- [ ] POST /api/groups/:groupId/members endpoint
- [ ] DELETE /api/groups/:groupId/members/:memberId endpoint
- [ ] POST /api/groups/:groupId/expenses endpoint with EQUAL example
- [ ] POST /api/groups/:groupId/expenses endpoint with EXACT example
- [ ] POST /api/groups/:groupId/expenses endpoint with PERCENTAGE example
- [ ] POST /api/groups/:groupId/expenses endpoint with SHARES example
- [ ] GET /api/groups/:groupId/expenses endpoint
- [ ] GET /api/expenses/:id endpoint
- [ ] PUT /api/expenses/:id endpoint
- [ ] DELETE /api/expenses/:id endpoint
- [ ] GET /api/groups/:groupId/balances endpoint (raw + optimized)
- [ ] POST /api/groups/:groupId/settlements endpoint
- [ ] GET /api/groups/:groupId/settlements endpoint
- [ ] POST /api/ai/parse-expense endpoint (with no-auto-save note)
- [ ] POST /api/ai/scan-bill endpoint (with no-auto-save note)
- [ ] GET /api/notifications endpoint
- [ ] PUT /api/notifications/:id/read endpoint
- [ ] All endpoints specify HTTP method
- [ ] All endpoints specify auth requirement
- [ ] All endpoints specify request body schema
- [ ] All endpoints specify response body schema
- [ ] All amount fields use integer paise in examples
- [ ] Balance endpoint shows optimized transfers example
- [ ] Placeholder member validation documented
- [ ] Error response format standardized

**FOLDER_STRUCTURE.md Checklist**:
- [ ] Monorepo root with backend/ and frontend/
- [ ] backend/src/controllers/ with all 7 controllers
- [ ] backend/src/services/ with splitCalculator.ts
- [ ] backend/src/services/ with balanceEngine.ts
- [ ] backend/src/services/ with aiService.ts
- [ ] backend/src/routes/ with all 7 route files
- [ ] backend/src/middleware/ with authMiddleware.ts, errorHandler.ts, validateRequest.ts
- [ ] backend/src/utils/ with moneyUtils.ts
- [ ] backend/prisma/schema.prisma location shown
- [ ] backend/.env and .env.example shown
- [ ] frontend/src/components/ structure shown
- [ ] frontend/src/pages/ structure shown
- [ ] frontend/src/hooks/ structure shown
- [ ] frontend/src/services/ structure shown
- [ ] frontend/src/utils/ with moneyFormat.ts
- [ ] frontend/.env and .env.example shown
- [ ] splitCalculator.ts functions documented (calculateEqualSplit, etc.)
- [ ] balanceEngine.ts functions documented (calculateNetBalances, minimizeTransfers)
- [ ] aiService.ts functions documented (parseExpenseFromText, scanBillFromImage)
- [ ] aiService.ts specifies claude-sonnet-4-6 model
- [ ] moneyUtils.ts functions documented (paiseToRupees, rupeesToPaise)
- [ ] Service layer enforces Placeholder_Invariant noted

**ENV_TEMPLATE.md Checklist**:
- [ ] DATABASE_URL documented
- [ ] JWT_SECRET documented
- [ ] JWT_EXPIRES_IN documented
- [ ] ANTHROPIC_API_KEY documented
- [ ] PORT documented
- [ ] FRONTEND_URL documented
- [ ] NODE_ENV documented
- [ ] VITE_API_BASE_URL documented
- [ ] VITE_ prefix explained for frontend variables
- [ ] backend/.env location specified
- [ ] frontend/.env location specified
- [ ] .gitignore reminder included
- [ ] Example values provided

#### 3. Cross-Document Consistency Validation

**Automated Checks**:

```typescript
// Pseudo-code for validation script
function validateConsistency() {
  const schemaModels = parseSchemaModels("SCHEMA.md");
  const apiEndpoints = parseApiEndpoints("API_CONTRACT.md");
  const services = parseFolderStructure("FOLDER_STRUCTURE.md");
  const envVars = parseEnvVars("ENV_TEMPLATE.md");
  
  // Check model-endpoint alignment
  for (const model of schemaModels) {
    if (!apiEndpoints.some(e => e.path.includes(model.name.toLowerCase()))) {
      errors.push(`Model ${model.name} has no corresponding API endpoints`);
    }
  }
  
  // Check service-endpoint alignment
  for (const endpoint of apiEndpoints.filter(e => e.requiresBusinessLogic)) {
    if (!services.some(s => s.implements(endpoint))) {
      errors.push(`Endpoint ${endpoint.path} has no implementing service`);
    }
  }
  
  // Check environment variable usage
  for (const envVar of envVars) {
    if (!isUsedInCode(envVar, services)) {
      warnings.push(`Environment variable ${envVar.name} not referenced in code structure`);
    }
  }
  
  // Check integer paise usage
  for (const endpoint of apiEndpoints) {
    for (const amountField of endpoint.amountFields) {
      if (amountField.type !== "integer") {
        errors.push(`Endpoint ${endpoint.path} uses non-integer amount (violates Money_Invariant)`);
      }
    }
  }
  
  return { errors, warnings };
}
```

#### 4. Manual Review Process

**Review Steps**:
1. **Requirement Coverage**: Verify every acceptance criterion addressed
2. **Terminology Consistency**: Check glossary terms used consistently
3. **Invariant Documentation**: Ensure Money_Invariant, Split_Invariant, Placeholder_Invariant clearly stated
4. **Example Quality**: Verify API examples are complete and realistic
5. **Implementation Readiness**: Confirm documents provide sufficient detail to begin coding

**Review Checklist Questions**:
- Can a developer implement the Prisma schema from SCHEMA.md alone?
- Can a developer implement API routes from API_CONTRACT.md alone?
- Does FOLDER_STRUCTURE.md show where every service belongs?
- Does ENV_TEMPLATE.md list every environment variable needed?
- Are all split algorithms specified with examples?
- Is the debt minimization algorithm clearly described?
- Is the placeholder member constraint unambiguous?
- Is the AI no-auto-save policy explicit?
- Are all money values in integer paise?

#### 5. Acceptance Testing

**Phase 0 Completion Criteria**:
- [ ] All 4 planning documents created (SCHEMA.md, API_CONTRACT.md, FOLDER_STRUCTURE.md, ENV_TEMPLATE.md)
- [ ] All 81 acceptance criteria from 9 requirements addressed
- [ ] Requirement traceability matrix 100% complete
- [ ] Document completeness checklists all passing
- [ ] Cross-document consistency validation passes with 0 errors
- [ ] Manual review approved by stakeholder
- [ ] Documents committed to repository under `.kiro/specs/phase-0-planning/`

### Testing Tools

**Document Linters**:
- **markdownlint**: Enforce consistent Markdown formatting
- **remark-lint**: Validate Markdown structure (headings, lists, code blocks)

**Custom Validators**:
- **schema-validator**: Parse SCHEMA.md and check model completeness
- **api-validator**: Parse API_CONTRACT.md and verify endpoint specifications
- **consistency-checker**: Cross-reference all four documents for alignment

**Manual Review Tools**:
- **Requirement traceability spreadsheet**: Map acceptance criteria to sections
- **Checklist template**: Standardized review form for completeness

### Success Metrics

- **100% requirement coverage**: Every acceptance criterion mapped to document section
- **0 blocking errors**: No missing models, endpoints, services, or environment variables
- **< 5 warnings**: Minor inconsistencies or suggestions for improvement acceptable
- **Stakeholder approval**: Documents reviewed and approved for implementation phase

