# Splitwise 2.0 — Database Schema

This document defines the complete Prisma schema for Splitwise 2.0. All models are documented below with plain-English explanations followed by the Prisma schema blocks.

---

## Critical Money Handling Rules

**Money Invariant**: All money operations use integer paise only, never floats.

**Conversion Formula**: ₹1 = 100 paise

**Rounding Rule**: When splitting equally and the total does not divide evenly, the remainder paise is distributed to ensure the sum equals the total. Example: Rs. 100 ÷ 3 members → splits are [34, 33, 33] paise (3400, 3300, 3300). The first member (or the member with the largest share if using weighted splits) receives the extra paise.

**Split Invariant**: The sum of all `ExpenseSplit.amountPaise` for an expense MUST equal `Expense.totalAmountPaise`. This is enforced in the service layer, not at the database level.

**Placeholder Invariant**: A `GroupMember` must have either `userId` set (real registered user) OR `placeholderName` set (unregistered user), but never both null and never both non-null.

**Debt Minimization**: The balance engine uses a greedy algorithm that matches the maximum debtor with the maximum creditor repeatedly to minimize the number of transfers needed to settle all debts, while preserving net balance totals.

---

## Complete Prisma Schema

```prisma
// This is the Prisma schema file for Splitwise 2.0.
// Learn more: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USER MODEL
// ============================================================================

// Represents a registered user account in the system. Users can create groups,
// add expenses, and participate in expense splits. Authentication is handled
// via JWT tokens with bcrypt-hashed passwords stored in passwordHash.

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  phone        String?
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  createdGroups     Group[]         @relation("GroupCreator")
  memberships       GroupMember[]
  expensesPaid      Expense[]       @relation("ExpensePayer")
  expensesCreated   Expense[]       @relation("ExpenseCreator")
  notifications     Notification[]
}

// ============================================================================
// GROUP MODEL
// ============================================================================

// Represents a group of people who share expenses. A group can be a regular
// long-term group (e.g., "Roommates", "Office Lunch") or a trip group that
// has a defined end date and can be archived with a summary. The creator has
// admin privileges and can modify group settings.

model Group {
  id              String    @id @default(cuid())
  name            String
  description     String?
  createdByUserId String
  isTrip          Boolean   @default(false)
  tripEndDate     DateTime?
  isArchived      Boolean   @default(false)
  defaultCurrency String    @default("INR")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  createdBy     User          @relation("GroupCreator", fields: [createdByUserId], references: [id])
  members       GroupMember[]
  expenses      Expense[]
  settlements   Settlement[]
  notifications Notification[]
}

// ============================================================================
// GROUP MEMBER MODEL
// ============================================================================

// Represents a member of a group. This is the most complex model because it
// supports both registered users and "placeholder" unregistered users.
//
// A member can be either:
// (a) A real registered User — represented by a non-null userId foreign key
// (b) A placeholder — represented by a null userId, but a non-null placeholderName
//     plus at least one of placeholderPhone or placeholderEmail
//
// APPLICATION CONSTRAINT (enforced in service layer):
// Either userId is set OR placeholderName is set — never both null, never both non-null.
// This is the "Placeholder Invariant".

model GroupMember {
  id                String   @id @default(cuid())
  groupId           String
  userId            String?   // Nullable for placeholder members
  placeholderName   String?   // Nullable, but required if userId is null
  placeholderPhone  String?   // Optional contact info for placeholders
  placeholderEmail  String?   // Optional contact info for placeholders
  role              MemberRole @default(MEMBER)
  joinedAt          DateTime @default(now())

  // Relations
  group             Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user              User?          @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenseSplits     ExpenseSplit[]
  settlementsFrom   Settlement[]   @relation("SettlementFrom")
  settlementsTo     Settlement[]   @relation("SettlementTo")

  // Constraints
  @@unique([groupId, userId])  // Real users can only be in a group once
  @@index([groupId])
  @@index([userId])
}

enum MemberRole {
  ADMIN
  MEMBER
}

// ============================================================================
// EXPENSE MODEL
// ============================================================================

// Represents a single expense paid by one member and split among one or more
// members. The total amount is stored in paise (integer) to avoid floating-point
// errors. The splitType determines how the expense is divided (EQUAL, EXACT,
// PERCENTAGE, or SHARES). Expenses can be recurring (e.g., monthly rent) with
// a cron expression defining the recurrence pattern.
//
// INVARIANT (enforced in service layer):
// SUM of all ExpenseSplit.amountPaise for this expense MUST equal totalAmountPaise.
// This is the "Split Invariant".

model Expense {
  id                      String      @id @default(cuid())
  groupId                 String
  description             String
  totalAmountPaise        Int         // Money stored as integer paise only — NEVER Float
  paidByUserId            String
  splitType               SplitType
  date                    DateTime    @default(now())
  notes                   String?
  receiptImageUrl         String?
  isRecurring             Boolean     @default(false)
  recurringCronExpression String?     // e.g., "0 0 1 * *" for first of every month
  createdByUserId         String
  createdAt               DateTime    @default(now())
  updatedAt               DateTime    @updatedAt

  // Relations
  group       Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy      User           @relation("ExpensePayer", fields: [paidByUserId], references: [id])
  createdBy   User           @relation("ExpenseCreator", fields: [createdByUserId], references: [id])
  splits      ExpenseSplit[]
  notifications Notification[]

  @@index([groupId])
  @@index([paidByUserId])
  @@index([date])
}

enum SplitType {
  EQUAL       // Divide total equally among all members
  EXACT       // Each member has an explicit amount assigned
  PERCENTAGE  // Each member has a percentage share (must sum to 100%)
  SHARES      // Each member has integer shares (proportional split)
}

// ============================================================================
// EXPENSE SPLIT MODEL
// ============================================================================

// Represents one person's share of one expense. Each expense has multiple
// ExpenseSplit records — one for each member participating in that expense.
// The amount is stored in paise (integer) following the Money Invariant.
//
// ROUNDING RULE (applied during split calculation):
// When splitting equally and the total does not divide evenly, the GroupMember
// with the largest share (or the first member if shares are equal) absorbs the
// remainder paise to ensure the Split Invariant holds.
//
// The isSettled flag tracks whether this particular member's share has been
// paid back to the payer. This is updated when settlements are recorded.

model ExpenseSplit {
  id            String    @id @default(cuid())
  expenseId     String
  groupMemberId String
  amountPaise   Int       // Money stored as integer paise only — NEVER Float
  isSettled     Boolean   @default(false)
  settledAt     DateTime?

  // Relations
  expense      Expense      @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  groupMember  GroupMember  @relation(fields: [groupMemberId], references: [id], onDelete: Cascade)

  @@index([expenseId])
  @@index([groupMemberId])
}

// ============================================================================
// SETTLEMENT MODEL
// ============================================================================

// Represents a payment event that clears debt between two group members.
// This can be a manual cash payment, a UPI deep link payment, or (in future)
// a UPI gateway payment verified by webhook. Each settlement reduces the
// net balance between the from and to members.

model Settlement {
  id                 String          @id @default(cuid())
  groupId            String
  fromGroupMemberId  String
  toGroupMemberId    String
  amountPaise        Int             // Money stored as integer paise only — NEVER Float
  method             SettlementMethod
  upiTransactionId   String?         // Optional: UPI transaction ID for verification
  note               String?
  settledAt          DateTime        @default(now())
  createdAt          DateTime        @default(now())

  // Relations
  group        Group       @relation(fields: [groupId], references: [id], onDelete: Cascade)
  fromMember   GroupMember @relation("SettlementFrom", fields: [fromGroupMemberId], references: [id])
  toMember     GroupMember @relation("SettlementTo", fields: [toGroupMemberId], references: [id])

  @@index([groupId])
  @@index([fromGroupMemberId])
  @@index([toGroupMemberId])
}

enum SettlementMethod {
  MANUAL          // Cash or other manual payment
  UPI_DEEPLINK    // UPI payment initiated via deep link (MVP)
  UPI_GATEWAY     // UPI payment verified via webhook (stretch goal)
}

// ============================================================================
// NOTIFICATION MODEL
// ============================================================================

// Represents a notification sent to a user. Notifications are triggered by
// various events such as expense additions, settlements received, reminders
// for unpaid balances, and trip archival summaries. Users can mark notifications
// as read individually or in bulk.

model Notification {
  id              String           @id @default(cuid())
  userId          String
  type            NotificationType
  title           String
  body            String
  isRead          Boolean          @default(false)
  relatedGroupId  String?
  relatedExpenseId String?
  createdAt       DateTime         @default(now())

  // Relations
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  relatedGroup  Group?   @relation(fields: [relatedGroupId], references: [id], onDelete: Cascade)
  relatedExpense Expense? @relation(fields: [relatedExpenseId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isRead])
  @@index([createdAt])
}

enum NotificationType {
  REMINDER            // Reminder to settle outstanding balances
  TRIP_ARCHIVED       // Notification that a trip group was archived with summary
  EXPENSE_ADDED       // New expense added to a group
  SETTLEMENT_RECEIVED // Payment received from another member
  SETTLEMENT_SENT     // Payment sent to another member confirmed
}
```

---

## Schema Summary

This schema defines 7 models:

1. **User** — Registered user accounts with authentication
2. **Group** — Expense-sharing groups (regular or trip mode)
3. **GroupMember** — Members in groups (real users or placeholders)
4. **Expense** — Expenses with split type and total amount in paise
5. **ExpenseSplit** — Individual member shares of expenses
6. **Settlement** — Payment events that clear debts
7. **Notification** — User alerts for various events

All money fields use `Int` type storing amounts in paise. All invariants (Money, Split, Placeholder) are documented and enforced at the service layer.
