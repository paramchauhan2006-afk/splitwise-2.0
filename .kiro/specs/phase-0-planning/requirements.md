# Requirements Document: Phase 0 - Project Planning & Schema Design

## Introduction

Phase 0 is the foundational planning phase for Splitwise 2.0, a full-stack group expense-splitting web application. This phase focuses exclusively on creating comprehensive planning documents that will serve as ground truth for all future development phases. No application code will be written in this phase.

Splitwise 2.0 enables users to track shared expenses, split costs using multiple algorithms, settle debts optimally, and integrate AI-powered features for expense entry and bill scanning. The application uses a fixed tech stack with PostgreSQL, Node.js/Express backend, React/TypeScript frontend, and enforces strict money handling rules using integer arithmetic in paise.

## Glossary

- **System**: The Splitwise 2.0 application as a whole
- **Schema_Document**: SCHEMA.md - Complete Prisma database schema with all models and constraints
- **API_Contract_Document**: API_CONTRACT.md - Comprehensive REST API specification with all endpoints
- **Folder_Structure_Document**: FOLDER_STRUCTURE.md - Complete monorepo directory tree
- **Environment_Document**: ENV_TEMPLATE.md - All required environment variables
- **Planning_Document**: Any of the four deliverable documents from Phase 0
- **Paise**: Integer representation of currency (₹1 = 100 paise)
- **Split_Algorithm**: Method for dividing expense amount (EQUAL, EXACT, PERCENTAGE, SHARES)
- **Debt_Graph**: Network of pairwise balances between group members
- **Placeholder_Member**: Unregistered user represented by name and contact info only
- **Rounding_Rule**: Method for distributing remainder paise to members
- **Money_Invariant**: Constraint that all money operations use integers only
- **Split_Invariant**: Constraint that sum of all expense splits equals total
- **Placeholder_Invariant**: Constraint that GroupMember has either userId OR placeholderName, never both null
- **Debt_Minimization**: Algorithm to reduce transfers while clearing all balances

## Requirements

### Requirement 1: Database Schema Documentation

**User Story:** As a developer, I want a complete Prisma schema document, so that I can implement the database layer with all required models and constraints.

#### Acceptance Criteria

1. THE Schema_Document SHALL define a User model with fields for authentication (email, password hash, name, phone)
2. THE Schema_Document SHALL define a Group model with fields for name, description, creator, and creation date
3. THE Schema_Document SHALL define a GroupMember model with userId field (nullable), placeholderName field (nullable), and constraint documentation stating the Placeholder_Invariant
4. THE Schema_Document SHALL define an Expense model with payer, group, amount (integer paise), description, date, and split type fields
5. THE Schema_Document SHALL define an ExpenseSplit model with member, amount (integer paise), and share fields
6. THE Schema_Document SHALL define a Settlement model tracking manual payments between members
7. THE Schema_Document SHALL define a Notification model for user alerts
8. THE Schema_Document SHALL document the Money_Invariant stating all amount fields use integer paise only
9. THE Schema_Document SHALL document the Rounding_Rule stating first or largest member receives remainder paise
10. THE Schema_Document SHALL document the Split_Invariant stating sum of ExpenseSplit amounts equals Expense total

### Requirement 2: API Contract Documentation

**User Story:** As a developer, I want a complete REST API specification, so that I can implement backend routes and frontend integration with consistent interfaces.

#### Acceptance Criteria

1. THE API_Contract_Document SHALL define authentication endpoints under /api/auth (register, login, logout, current user)
2. THE API_Contract_Document SHALL define group endpoints under /api/groups (create, read, update, delete, list)
3. THE API_Contract_Document SHALL define member endpoints for adding and removing group members
4. THE API_Contract_Document SHALL define expense endpoints with examples for all four Split_Algorithm types (EQUAL, EXACT, PERCENTAGE, SHARES)
5. THE API_Contract_Document SHALL define balance endpoints returning both raw pairwise balances and optimized transfer list
6. THE API_Contract_Document SHALL define settlement endpoints for recording manual payments
7. THE API_Contract_Document SHALL define AI endpoints for NLP expense parsing and bill scan processing
8. THE API_Contract_Document SHALL define notification endpoints for retrieving and marking user alerts
9. FOR ALL endpoints, THE API_Contract_Document SHALL specify HTTP method, authentication requirement, request body schema, and response body schema
10. THE API_Contract_Document SHALL organize endpoints by logical sections with clear purpose statements

### Requirement 3: Folder Structure Documentation

**User Story:** As a developer, I want a complete monorepo folder tree, so that I can organize code files consistently across frontend and backend packages.

#### Acceptance Criteria

1. THE Folder_Structure_Document SHALL define a monorepo root with frontend/ and backend/ packages
2. THE Folder_Structure_Document SHALL expand the backend structure showing controllers, services, routes, middleware, and prisma directories
3. THE Folder_Structure_Document SHALL document splitCalculator.ts service with functions for all four Split_Algorithm implementations plus Rounding_Rule logic
4. THE Folder_Structure_Document SHALL document balanceEngine.ts service with functions for calculating net balances and Debt_Minimization algorithm
5. THE Folder_Structure_Document SHALL document aiService.ts with functions for Anthropic API integration
6. THE Folder_Structure_Document SHALL expand the frontend structure showing components, pages, hooks, services, and utils directories
7. THE Folder_Structure_Document SHALL show configuration files (tsconfig, package.json, .env.example) at appropriate levels
8. THE Folder_Structure_Document SHALL include prisma/schema.prisma location in backend structure
9. THE Folder_Structure_Document SHALL show separation of concerns with clear service layer boundaries
10. THE Folder_Structure_Document SHALL indicate key utility files for money formatting and validation

### Requirement 4: Environment Variables Documentation

**User Story:** As a developer, I want documentation of all required environment variables, so that I can configure local and production environments correctly.

#### Acceptance Criteria

1. THE Environment_Document SHALL define DATABASE_URL variable for PostgreSQL connection
2. THE Environment_Document SHALL define JWT_SECRET variable for authentication token signing
3. THE Environment_Document SHALL define JWT_EXPIRES_IN variable for token expiry duration
4. THE Environment_Document SHALL define ANTHROPIC_API_KEY variable for AI service integration
5. THE Environment_Document SHALL define PORT variable for backend server configuration
6. THE Environment_Document SHALL define FRONTEND_URL variable for frontend URL whitelisting
7. THE Environment_Document SHALL define NODE_ENV variable for environment switching
8. THE Environment_Document SHALL define VITE_API_BASE_URL variable for frontend API endpoint
9. FOR ALL frontend variables, THE Environment_Document SHALL use VITE_ prefix per Vite requirements
10. THE Environment_Document SHALL specify .env file locations (backend/.env and frontend/.env)
11. THE Environment_Document SHALL include .gitignore reminder to exclude .env files from version control

### Requirement 5: Split Algorithm Specifications

**User Story:** As a developer, I want detailed specifications for all split algorithms, so that I can implement expense splitting with correct rounding behavior.

#### Acceptance Criteria

1. WHEN implementing EQUAL split, THE System SHALL divide total by member count and apply Rounding_Rule
2. WHEN implementing EXACT split, THE System SHALL accept explicit amounts for each member and validate Split_Invariant
3. WHEN implementing PERCENTAGE split, THE System SHALL accept percentage shares, calculate amounts, and apply Rounding_Rule
4. WHEN implementing SHARES split, THE System SHALL accept integer shares, calculate proportional amounts, and apply Rounding_Rule
5. THE Schema_Document SHALL document the Rounding_Rule algorithm: Rs. 100 ÷ 3 → [34, 33, 33] paise with first member receiving remainder
6. FOR ALL split algorithms, THE Schema_Document SHALL specify that calculations preserve Money_Invariant
7. FOR ALL split algorithms, THE Schema_Document SHALL specify validation of Split_Invariant
8. THE API_Contract_Document SHALL provide request/response examples for each Split_Algorithm
9. THE Folder_Structure_Document SHALL indicate splitCalculator.ts exports functions: calculateEqualSplit, calculateExactSplit, calculatePercentageSplit, calculateSharesSplit
10. THE Folder_Structure_Document SHALL indicate splitCalculator.ts exports validateSplitInvariant utility function

### Requirement 6: Debt Minimization Specification

**User Story:** As a developer, I want specifications for debt optimization, so that I can implement balance settlement with minimum transfers.

#### Acceptance Criteria

1. THE API_Contract_Document SHALL define balance endpoint returning both raw pairwise Debt_Graph and optimized transfer list
2. THE Folder_Structure_Document SHALL indicate balanceEngine.ts exports calculateNetBalances function
3. THE Folder_Structure_Document SHALL indicate balanceEngine.ts exports minimizeTransfers function implementing Debt_Minimization
4. THE Schema_Document SHALL document that Debt_Minimization reduces transfers while preserving net balance totals
5. THE API_Contract_Document SHALL specify optimized transfer list format with from, to, and amount fields
6. THE API_Contract_Document SHALL specify raw balance format as pairwise member relationships
7. WHEN calculating optimized transfers, THE System SHALL ensure sum of transfers equals sum of raw balances
8. THE Schema_Document SHALL document that Debt_Minimization uses greedy algorithm matching max debtor with max creditor
9. THE Folder_Structure_Document SHALL indicate balanceEngine uses Money_Invariant for all calculations
10. THE API_Contract_Document SHALL provide example showing fewer optimized transfers than raw pairwise balances

### Requirement 7: Placeholder Member Specification

**User Story:** As a developer, I want specifications for placeholder members, so that I can support unregistered users in expense splits.

#### Acceptance Criteria

1. THE Schema_Document SHALL define GroupMember.userId as nullable foreign key to User
2. THE Schema_Document SHALL define GroupMember.placeholderName as nullable string field
3. THE Schema_Document SHALL define GroupMember.placeholderPhone as nullable string field
4. THE Schema_Document SHALL define GroupMember.placeholderEmail as nullable string field
5. THE Schema_Document SHALL document Placeholder_Invariant: exactly one of userId OR placeholderName must be non-null
6. THE API_Contract_Document SHALL define member endpoints accepting either userId or placeholder fields
7. THE API_Contract_Document SHALL specify validation error when both userId and placeholderName are null
8. THE API_Contract_Document SHALL specify validation error when both userId and placeholderName are non-null
9. THE Schema_Document SHALL document that Placeholder_Member represents unregistered user by name and contact only
10. THE Folder_Structure_Document SHALL indicate service layer enforces Placeholder_Invariant validation

### Requirement 8: AI Service Integration Specification

**User Story:** As a developer, I want specifications for AI features, so that I can integrate Anthropic Claude API for NLP parsing and bill scanning.

#### Acceptance Criteria

1. THE API_Contract_Document SHALL define /api/ai/parse-expense endpoint accepting natural language text
2. THE API_Contract_Document SHALL define /api/ai/scan-bill endpoint accepting image file upload
3. THE API_Contract_Document SHALL specify parse-expense returns structured expense data (amount, description, participants)
4. THE API_Contract_Document SHALL specify scan-bill returns structured expense data extracted from bill image
5. THE Environment_Document SHALL document ANTHROPIC_API_KEY requirement for Claude API access
6. THE Folder_Structure_Document SHALL indicate aiService.ts exports parseExpenseFromText function
7. THE Folder_Structure_Document SHALL indicate aiService.ts exports scanBillFromImage function
8. THE Schema_Document SHALL document that AI-extracted amounts are returned in paise following Money_Invariant
9. THE API_Contract_Document SHALL specify AI endpoints require authentication
10. THE Folder_Structure_Document SHALL indicate aiService uses claude-sonnet-4-6 model version
11. THE API_Contract_Document SHALL explicitly state that BOTH AI endpoints (/parse-expense and /scan-bill) return a pre-filled data object for a confirm screen ONLY and MUST NOT save any data to the database. Auto-saving AI output is forbidden.

### Requirement 9: Money Handling Specification

**User Story:** As a developer, I want explicit money handling rules, so that I can avoid floating-point errors and maintain financial accuracy.

#### Acceptance Criteria

1. THE Schema_Document SHALL specify all amount fields use Int type for paise storage
2. THE Schema_Document SHALL document Money_Invariant: "All money operations use integer paise only, never floats"
3. THE Schema_Document SHALL provide conversion formula: ₹1 = 100 paise
4. THE Folder_Structure_Document SHALL indicate moneyUtils.ts exports paiseToRupees formatting function
5. THE Folder_Structure_Document SHALL indicate moneyUtils.ts exports rupeesToPaise parsing function
6. THE API_Contract_Document SHALL specify all API amount fields use integer paise
7. THE API_Contract_Document SHALL provide examples showing amounts in paise (e.g., ₹100.50 = 10050 paise)
8. THE Schema_Document SHALL document that Split_Invariant validation operates on paise integers
9. THE Schema_Document SHALL document that Rounding_Rule distributes integer paise remainder
10. THE Folder_Structure_Document SHALL indicate splitCalculator.ts validates Money_Invariant for all operations

## Requirements Quality Checklist

All requirements in this document have been structured following EARS patterns and INCOSE quality rules:

- ✅ Active voice with clear system identification
- ✅ No vague terms (quickly, adequate, reasonable)
- ✅ No pronouns - specific system names used
- ✅ Consistent terminology from Glossary
- ✅ Explicit, measurable conditions
- ✅ No escape clauses (where possible, if feasible)
- ✅ Solution-free acceptance criteria focusing on "what" not "how"
- ✅ Positive statements preferred
- ✅ One testable condition per acceptance criterion
