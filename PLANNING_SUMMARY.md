# Splitwise 2.0 — Phase 0 Planning Summary

This document provides an overview of the planning deliverables created for Splitwise 2.0 Phase 0.

---

## Plain-English Summary

Here's what was created in Phase 0, explained for non-technical stakeholders:

1. **Database Blueprint (SCHEMA.md)**: Defines how we'll store data in tables—like organizing information into filing cabinets. We specified 7 different types of records: Users (people with accounts), Groups (collections of people sharing expenses), GroupMembers (who's in which group, including people who haven't registered yet), Expenses (money spent), ExpenseSplits (how each expense is divided), Settlements (payments between people), and Notifications (alerts). The blueprint includes strict rules: all money amounts must be stored as whole numbers (in paise, not rupees with decimals) to avoid rounding errors, and all splits must add up exactly to the total expense.

2. **API Specification (API_CONTRACT.md)**: Documents how the mobile/web app talks to the server—like a menu showing what requests you can make and what responses you'll get. We defined 30+ endpoints organized into 8 categories: authentication (login/signup), groups (create/view/edit), members (add/remove people), expenses (record spending with 4 different split methods), balances (see who owes whom), settlements (record payments), AI features (smart expense entry from photos or text), and notifications. Each endpoint shows exactly what information to send and what you'll receive back, all using whole-number amounts in paise.

3. **Code Organization Plan (FOLDER_STRUCTURE.md)**: Shows where every piece of code will live—like a floor plan for a building. The project is split into two main areas: `backend/` (server code handling data and business logic) and `frontend/` (user interface code for React web app). We specified critical service files like `splitCalculator.ts` (implements the 4 split algorithms with correct rounding), `balanceEngine.ts` (calculates who owes whom and minimizes transfers using an optimization algorithm), and `aiService.ts` (connects to Claude AI for smart expense parsing). Everything is organized by function: controllers handle web requests, services contain business logic, and utilities provide reusable tools.

4. **Configuration Guide (ENV_TEMPLATE.md)**: Lists all the settings needed to run the application—like the instruction manual for assembling furniture. We documented 8 backend settings (database connection, security keys, AI API access, server port, CORS settings) and 1 frontend setting (API endpoint URL). Each variable has a description explaining its purpose and example values. Includes critical reminders about keeping secret keys in `.env` files that aren't committed to version control.

5. **Implementation Checklist (tasks.md)**: Breaks Phase 1 development into 24 concrete steps organized into 8 groups—like a construction project plan. The groups cover: project setup, database initialization, authentication, groups CRUD, member management, expense creation with all split types, balance calculation, and settlement recording. Each task is atomic (one clear action), verifiable (you know when it's done), and traceable (linked to specific requirements). Two checkpoint tasks ensure we validate progress incrementally rather than finding problems at the end.

---

## Design Decisions

Here are the key choices made during Phase 0 planning that weren't explicitly mandated by the original requirements:

### 1. Document Organization Strategy

**Decision**: Organized the four planning documents in a hierarchical relationship where SCHEMA.md defines the data layer, API_CONTRACT.md defines the interface layer, FOLDER_STRUCTURE.md defines the implementation layer, and ENV_TEMPLATE.md defines the configuration layer.

**Rationale**: This creates a clear separation of concerns where each document has a distinct responsibility. Changes to data models cascade to API endpoints, which cascade to implementation structure, which cascade to configuration needs. This makes the documents easier to maintain and review.

### 2. Prisma Schema Comments for Invariants

**Decision**: Documented Money_Invariant, Split_Invariant, and Placeholder_Invariant as comments directly in the Prisma schema file rather than only in separate documentation.

**Rationale**: Putting constraints where developers will see them while working reduces the chance of violations. Comments in the schema file serve as inline documentation that's always visible during development.

### 3. Split Type Enum at Database Level

**Decision**: Defined `SplitType` as a Prisma enum with values `EQUAL`, `EXACT`, `PERCENTAGE`, `SHARES` rather than storing as string.

**Rationale**: Database-level enums provide type safety and prevent invalid split type values from being stored. This catches errors earlier in the development process and makes the data model more explicit.

### 4. Separate `share` Field in ExpenseSplit

**Decision**: Added a nullable `share` field to `ExpenseSplit` to store the original input (percentage or share count) separate from the calculated `amount`.

**Rationale**: This creates an audit trail showing both the user's input and the calculated result. If rounding rules change or bugs are discovered, we can recalculate amounts from the original shares without losing information.

### 5. Self-Referential Settlement Relations

**Decision**: Used explicit relation names (`"from"` and `"to"`) for the two GroupMember relations in the Settlement model.

**Rationale**: Prisma requires explicit relation names when a model has multiple foreign keys to the same target model. This also makes the settlement direction clearer in queries (who paid whom).

### 6. Controller-Service Architecture Pattern

**Decision**: Separated HTTP request handling (controllers) from business logic (services) in the folder structure.

**Rationale**: This follows the standard MVC pattern and makes code more testable. Services can be tested in isolation without mocking HTTP requests, and controllers remain thin layers that just handle HTTP concerns.

### 7. Monorepo with Separate Backend/Frontend Packages

**Decision**: Structured the project as a monorepo with independent `backend/` and `frontend/` packages rather than nested or separate repositories.

**Rationale**: A monorepo with separate packages allows independent deployment (Vercel for frontend, Render for backend) while keeping all code in one repository for easier coordination. Each package has its own `package.json` and dependencies.

### 8. Money Utilities in Both Backend and Frontend

**Decision**: Created `moneyUtils.ts` files in both backend and frontend with conversion functions (paise ↔ rupees).

**Rationale**: The backend needs to convert user input (rupees) to storage format (paise), while the frontend needs to convert storage format (paise) to display format (rupees). Duplicating this logic ensures each layer can handle conversions independently without API round-trips.

### 9. Greedy Algorithm for Debt Minimization

**Decision**: Specified a greedy algorithm (repeatedly match largest debtor with largest creditor) for the `minimizeTransfers` function rather than more complex optimization algorithms.

**Rationale**: The greedy algorithm is simple to implement, fast (O(n log n)), and produces good results for small groups (typical use case). More sophisticated algorithms (like network flow) are overkill for groups under 20 people and would add complexity.

### 10. AI Endpoints Return Pre-Filled Data Only

**Decision**: Explicitly documented that `/api/ai/parse-expense` and `/api/ai/scan-bill` must NOT auto-save parsed data to the database, only return it for user confirmation.

**Rationale**: AI parsing can have errors or misinterpretations. Requiring user review before saving prevents incorrect data from polluting the database and gives users control over their data. This was a critical safety decision for AI features.

### 11. Placeholder Contact Info as Optional

**Decision**: Made `placeholderPhone` and `placeholderEmail` both optional (nullable) in the `GroupMember` model, requiring only `placeholderName`.

**Rationale**: Sometimes users want to split expenses with someone they only know by name (e.g., "that guy at the restaurant" or a nickname). Requiring contact info would prevent legitimate use cases. The Placeholder_Invariant only enforces that `placeholderName` must be present if `userId` is null.

### 12. JWT Stored in Authorization Header (Not Cookies)

**Decision**: API_CONTRACT.md specifies JWT tokens passed via `Authorization: Bearer <token>` header rather than httpOnly cookies.

**Rationale**: Bearer tokens are simpler for mobile apps and API clients to implement. While httpOnly cookies provide CSRF protection, they require additional CSRF token handling. For an MVP focusing on API-first design, Bearer tokens are more straightforward.

### 13. Pagination for Expense Listing

**Decision**: Added pagination parameters (`page`, `limit`) to the `GET /api/groups/:groupId/expenses` endpoint.

**Rationale**: Groups with hundreds of expenses would cause performance issues and poor UX if all loaded at once. Pagination is essential for scalability and was included proactively even though it wasn't explicitly required.

### 14. Task Groups Aligned with Feature Domains

**Decision**: Organized tasks into 8 groups (A-H) based on feature domains (Auth, Groups, Members, Expenses, etc.) rather than technical layers (database, API, frontend).

**Rationale**: Feature-based organization allows developers to complete vertical slices (database + API + frontend for one feature) rather than horizontal layers. This enables earlier validation and faster feedback loops.

### 15. Vite Prefix Requirement for Frontend Env Vars

**Decision**: Specified that all frontend environment variables must use the `VITE_` prefix (e.g., `VITE_API_BASE_URL`).

**Rationale**: This is a Vite framework requirement—environment variables without the `VITE_` prefix are not exposed to client-side code. Documenting this explicitly prevents common configuration errors.

---

## Open Questions

The following items require clarification or decisions before Phase 1 implementation begins:

### 1. Password Strength Requirements

**Question**: What are the minimum password requirements for user registration (length, complexity, character types)?

**Impact**: Affects validation logic in `authController.register` and frontend `RegisterPage` form.

**Recommendation**: Enforce minimum 8 characters with at least one number and one letter. Display requirements below password input.

---

### 2. Group Deletion vs. Archival

**Question**: When a group is "deleted," should it be hard-deleted (removed from database) or soft-deleted (marked `isArchived` but data preserved)?

**Impact**: Affects `groupController.delete` implementation and potential future "unarchive" feature.

**Recommendation**: Soft-delete with `isArchived` flag. Allows users to restore accidentally deleted groups and preserves historical data for auditing.

---

### 3. Member Removal with Non-Zero Balance

**Question**: Should members with non-zero balances be allowed to be removed from a group, or should this be blocked until they settle up?

**Impact**: Affects `groupController.removeMember` validation logic.

**Recommendation**: Block removal if balance is non-zero. Display error message: "This member has outstanding balance of Rs. X.XX. Please settle up before removing." Alternatively, allow removal but keep as placeholder with archived status.

---

### 4. Expense Edit History Tracking

**Question**: The API_CONTRACT.md mentions "creates an edit history entry" for expense edits. Should we implement a full audit log table or just overwrite the expense?

**Impact**: If audit log is required, need to create `ExpenseHistory` model in SCHEMA.md and migration logic.

**Recommendation**: For MVP (Phase 1), simply overwrite the expense and track `updatedAt` timestamp. Add full audit log in Phase 2 if users request it.

---

### 5. AI Confidence Threshold for Warnings

**Question**: The AI endpoints return a `confidence` score (0.0-1.0). What threshold should trigger a warning to users (e.g., "Low confidence - please review carefully")?

**Impact**: Affects frontend `AIConfirmScreen` component display logic.

**Recommendation**: Display warning icon if confidence < 0.8. Always show full confirmation screen regardless of confidence (never auto-save).

---

### 6. Notification Delivery Mechanism

**Question**: The Notification model stores messages in the database, but how should they be delivered to users in real-time? (WebSockets, polling, push notifications?)

**Impact**: Affects notification implementation architecture and frontend notification state management.

**Recommendation**: For MVP, use simple polling (frontend checks `/api/notifications` every 30 seconds). Add WebSocket support in Phase 2 for real-time delivery.

---

### 7. Rounding Rule Edge Cases

**Question**: The rounding rule states "first member" receives remainder paise. What is "first" when members have no natural order? Should it be first by join date, alphabetically, or first in the splits array?

**Impact**: Affects `splitCalculator.applyRoundingRule` implementation.

**Recommendation**: Use first in the splits array as provided by the API request (allows frontend to control order). Document this behavior in API_CONTRACT.md examples.

---

### 8. Placeholder Member Uniqueness

**Question**: Can multiple GroupMembers have the same `placeholderName` within a group? (E.g., two different people both named "Rahul")

**Impact**: Affects whether to add a unique constraint on `[groupId, placeholderName]` in schema.

**Recommendation**: Allow duplicate placeholder names. If collisions occur, users can differentiate by adding phone/email or editing names (e.g., "Rahul S" vs "Rahul K"). Enforcing uniqueness would be too restrictive.

---

### 9. Debt Minimization Algorithm Handling of Placeholders

**Question**: Should the debt minimization algorithm treat placeholder members differently than registered users? (E.g., prioritize registered users for transfers?)

**Impact**: Affects `balanceEngine.minimizeTransfers` sorting logic.

**Recommendation**: Treat placeholder and registered members identically for balance calculations. Transfers are purely mathematical—membership status shouldn't affect optimization.

---

### 10. Currency Support Beyond INR

**Question**: The SCHEMA.md includes a `defaultCurrency` field on Group but all examples use INR (Indian Rupees). Should Phase 1 support multiple currencies or is this a future feature?

**Impact**: If multi-currency is needed, must add currency conversion logic, update Money_Invariant to specify base unit per currency, and handle exchange rates.

**Recommendation**: MVP supports INR only. Store `defaultCurrency` field for future expansion but hardcode all logic to INR. Add multi-currency in Phase 3 after user feedback.

---

### 11. Recurring Expenses Implementation

**Question**: The Expense model includes `isRecurring` and `recurringCronExpression` fields, but no API endpoints were specified for managing recurring expense schedules.

**Impact**: Requires additional endpoints (`POST /api/expenses/:id/recur`, `DELETE /api/expenses/:id/recurrence`) and background job system to create expenses on schedule.

**Recommendation**: Mark recurring fields as nullable/optional in MVP. Implement recurring expense feature in Phase 2 with proper job scheduler (node-cron or external service).

---

### 12. Rate Limiting and API Security

**Question**: Should we implement rate limiting on API endpoints to prevent abuse? If yes, what limits (e.g., 100 requests per minute per IP)?

**Impact**: Requires adding rate limiting middleware (`express-rate-limit`) and configuring per-endpoint limits.

**Recommendation**: Add basic rate limiting in MVP: 100 req/min for authenticated endpoints, 20 req/min for auth endpoints (login/register). Configure via ENV_TEMPLATE.md with `RATE_LIMIT_MAX` variable.

---

## Validation Checklist

Before proceeding to Phase 1, verify:

- [ ] All 4 planning documents created: SCHEMA.md, API_CONTRACT.md, FOLDER_STRUCTURE.md, ENV_TEMPLATE.md
- [ ] All 9 requirements from requirements.md addressed
- [ ] Money_Invariant documented in SCHEMA.md, API_CONTRACT.md, and FOLDER_STRUCTURE.md
- [ ] Split_Invariant documented with validation approach
- [ ] Placeholder_Invariant documented with enforcement strategy
- [ ] All 4 split algorithms (EQUAL, EXACT, PERCENTAGE, SHARES) specified with examples
- [ ] Debt minimization algorithm described
- [ ] AI endpoints explicitly state no-auto-save policy
- [ ] All environment variables documented with VITE_ prefix for frontend
- [ ] Tasks.md contains 24 tasks organized into 8 groups (A-H)
- [ ] Open questions reviewed and decisions made or deferred

---

## Next Steps

1. **Review this summary** and all four planning documents with stakeholders
2. **Resolve open questions** or defer to later phases
3. **Approve Phase 0 deliverables** to unblock Phase 1 implementation
4. **Begin Phase 1 execution** using tasks.md as the checklist
5. **Set up development environment** (PostgreSQL, Node.js, Anthropic API key)
6. **Create GitHub repository** and commit all planning documents

---

Phase 0 Planning is complete. Ready to proceed to Phase 1: Core MVP Implementation.
