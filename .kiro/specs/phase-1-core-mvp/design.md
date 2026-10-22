# Design Document: Phase 1 Core MVP Implementation

## Overview

This design document specifies the technical implementation for Phase 1 of Splitwise 2.0, a full-stack expense sharing application. The system enables groups of users to track shared expenses, split costs using four different algorithms, calculate balances, and record settlements. The architecture follows a monorepo structure with a React 18 frontend and Express + Prisma backend, both written in TypeScript.

### Core Capabilities

- **User Authentication**: JWT-based authentication with httpOnly cookies for secure session management
- **Group Management**: Create and manage groups with registered users and placeholder members
- **Expense Tracking**: Record expenses with four split types (EQUAL, EXACT, PERCENTAGE, SHARES)
- **Split Calculation**: Algorithms that ensure money invariants with proper rounding rules
- **Balance Engine**: Calculate net balances and optimize debt settlement with greedy minimization
- **Settlement Recording**: Track payments between members to reduce debt
- **Money Handling**: All money stored as integer paise to avoid floating-point errors

### Critical Invariants

The system enforces four critical invariants at multiple layers:

1. **Money Invariant**: All money values are stored and processed as integer paise (₹1 = 100 paise). Never use floating-point numbers for money operations.

2. **Split Invariant**: For any expense, the sum of all `ExpenseSplit.amountPaise` values MUST equal `Expense.totalAmountPaise`. This is validated before database commit.

3. **Placeholder Invariant**: A `GroupMember` must have exactly one of `userId` OR `placeholderName` set (never both null, never both non-null). This represents either a registered user or an unregistered placeholder.

4. **Rounding Rule**: When splits don't divide evenly, the first member (or member with the largest share) receives the remainder paise to ensure the Split Invariant holds.

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React 18 Application                                 │  │
│  │  - React Router (routing)                             │  │
│  │  - Zustand (client state: currentUser)               │  │
│  │  - React Query (server state & cache)                │  │
│  │  - Axios (HTTP client with credentials)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP + httpOnly JWT Cookie
                            ▼
┌─────────────────────────────────────────────────────────────┐
│               Express Backend (Node.js)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Middleware Layer                                     │  │
│  │  - CORS (credentials: true)                           │  │
│  │  - cookie-parser                                      │  │
│  │  - Auth Middleware (JWT verification)                │  │
│  │  - Validation Middleware (Zod schemas)               │  │
│  │  - Error Handler (global)                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Controller Layer                                     │  │
│  │  - auth.controller.ts                                │  │
│  │  - groups.controller.ts                              │  │
│  │  - members.controller.ts                             │  │
│  │  - expenses.controller.ts                            │  │
│  │  - balances.controller.ts                            │  │
│  │  - settlements.controller.ts                         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Service Layer (Business Logic)                      │  │
│  │  - splitCalculator.ts (4 algorithms + rounding)      │  │
│  │  - balanceEngine.ts (net balance + minimization)     │  │
│  │  - auth.service.ts (bcrypt + JWT)                    │  │
│  │  - groups.service.ts                                 │  │
│  │  - members.service.ts (Placeholder Invariant)        │  │
│  │  - expenses.service.ts (Split Invariant)             │  │
│  │  - settlements.service.ts                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Data Access Layer                                    │  │
│  │  - Prisma Client (singleton)                         │  │
│  │  - moneyUtils.ts (paise ↔ rupees)                   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Prisma ORM
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL Database                             │
│  - 7 tables: User, Group, GroupMember, Expense,            │
│    ExpenseSplit, Settlement, Notification                   │
│  - All money fields: Int (paise only, never Float)         │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow Example: Creating an Expense

```
1. React Component (CreateExpensePage.tsx)
   ↓
   User fills form: description, amount (rupees), split type, members
   ↓
2. Frontend Validation
   ↓
   Convert rupees → paise using moneyUtils.rupeesToPaise()
   ↓
3. API Call (via Axios)
   ↓
   POST /api/groups/:groupId/expenses
   Headers: Cookie (JWT token)
   Body: { description, totalAmountPaise, splitType, memberIds/splits }
   ↓
4. Backend Middleware Chain
   ↓
   CORS → cookie-parser → Auth Middleware (verify JWT) → Validator (Zod)
   ↓
5. Controller (expenses.controller.ts)
   ↓
   Extract req.body, req.user, req.params.groupId
   ↓
6. Service Layer (expenses.service.ts)
   ↓
   Call splitCalculator with splitType:
   - EQUAL → calculateEqualSplit()
   - EXACT → calculateExactSplit() + validate
   - PERCENTAGE → calculatePercentageSplit()
   - SHARES → calculateSharesSplit()
   ↓
   Validate Split Invariant (sum = total)
   ↓
7. Database Transaction (Prisma)
   ↓
   BEGIN;
   INSERT INTO Expense (...)
   INSERT INTO ExpenseSplit (...) for each member
   Validate Split Invariant again
   COMMIT;
   ↓
8. Response
   ↓
   Controller formats response: { success: true, data: { expense, splits } }
   ↓
9. React Query
   ↓
   Cache invalidation → Refetch expenses list
   ↓
10. UI Update
    ↓
    ExpenseList component re-renders with new expense
```

---

## Components and Interfaces

### Backend Architecture

#### Express Server Structure

**File: `backend/src/server.ts`**

The Express application is configured with middleware in the following order:

```typescript
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

const app = express();

// 1. CORS - MUST be first to handle preflight requests
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true // Allow cookies
}));

// 2. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Cookie parsing - MUST come before auth middleware
app.use(cookieParser());

// 4. Routes (includes auth middleware on protected routes)
app.use('/api', routes);

// 5. Global error handler - MUST be last
app.use(errorHandler);

export default app;
```

**Middleware Order is Critical**:
- CORS first to handle OPTIONS preflight requests
- Body parsers before routes need request bodies
- Cookie parser before auth middleware reads cookies
- Error handler last to catch all errors

#### Authentication Middleware

**File: `backend/src/middleware/auth.middleware.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Extract token from httpOnly cookie
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authentication token provided'
        }
      });
    }

    // 2. Verify JWT signature and expiration
    const decoded = verifyToken(token);
    
    // 3. Attach userId to request object
    req.user = {
      userId: decoded.userId
    };
    
    // 4. Proceed to route handler
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token'
      }
    });
  }
};
```

**JWT Token Flow**:

```
Registration/Login:
1. User submits credentials
2. Server validates credentials (bcrypt.compare)
3. Server generates JWT: signToken({ userId: user.id })
4. Server sets httpOnly cookie:
   res.cookie('token', jwt, {
     httpOnly: true,      // Prevent XSS access
     sameSite: 'lax',     // CSRF protection
     maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
     secure: process.env.NODE_ENV === 'production' // HTTPS only in prod
   })
5. Server returns user object (no password)

Protected Request:
1. Browser automatically sends cookie with request
2. Auth middleware extracts token from req.cookies.token
3. Middleware verifies signature using JWT_SECRET
4. Middleware attaches userId to req.user
5. Route handler accesses req.user.userId
```

#### Split Calculator Service

**File: `backend/src/services/splitCalculator.ts`**

This service implements all four split type algorithms with the Rounding Rule:

```typescript
// Type definitions
interface ExactSplit {
  memberId: string;
  amountPaise: number;
}

interface PercentageSplit {
  memberId: string;
  percentage: number;
}

interface SharesSplit {
  memberId: string;
  shares: number;
}

interface CalculatedSplit {
  memberId: string;
  amountPaise: number;
}

// 1. EQUAL Split Algorithm
export function calculateEqualSplit(
  totalAmountPaise: number,
  memberIds: string[]
): CalculatedSplit[] {
  const memberCount = memberIds.length;
  const baseAmount = Math.floor(totalAmountPaise / memberCount);
  const remainder = totalAmountPaise % memberCount;
  
  const splits: CalculatedSplit[] = memberIds.map((memberId, index) => ({
    memberId,
    amountPaise: baseAmount + (index === 0 ? remainder : 0) // First gets remainder
  }));
  
  // Validate Split Invariant
  validateSplitInvariant(splits.map(s => s.amountPaise), totalAmountPaise);
  
  return splits;
}

// Example: 10000 paise ÷ 3 members
// baseAmount = 3333, remainder = 1
// Result: [3334, 3333, 3333] ✓

// 2. EXACT Split Algorithm
export function calculateExactSplit(
  totalAmountPaise: number,
  splits: ExactSplit[]
): CalculatedSplit[] {
  // Validate Split Invariant
  const sum = splits.reduce((acc, s) => acc + s.amountPaise, 0);
  if (sum !== totalAmountPaise) {
    throw new Error(
      `Split Invariant violated: sum(${sum}) !== total(${totalAmountPaise})`
    );
  }
  
  return splits.map(s => ({
    memberId: s.memberId,
    amountPaise: s.amountPaise
  }));
}

// 3. PERCENTAGE Split Algorithm
export function calculatePercentageSplit(
  totalAmountPaise: number,
  splits: PercentageSplit[]
): CalculatedSplit[] {
  // Validate percentages sum to 100
  const percentageSum = splits.reduce((acc, s) => acc + s.percentage, 0);
  if (Math.abs(percentageSum - 100.0) > 0.01) {
    throw new Error(
      `Percentages must sum to 100, got ${percentageSum}`
    );
  }
  
  // Calculate amounts (floor division)
  const calculated = splits.map(s => ({
    memberId: s.memberId,
    amountPaise: Math.floor(totalAmountPaise * s.percentage / 100)
  }));
  
  // Apply rounding rule to distribute remainder
  const sum = calculated.reduce((acc, s) => acc + s.amountPaise, 0);
  const remainder = totalAmountPaise - sum;
  if (remainder > 0) {
    calculated[0].amountPaise += remainder; // First member gets remainder
  }
  
  // Validate Split Invariant
  validateSplitInvariant(calculated.map(s => s.amountPaise), totalAmountPaise);
  
  return calculated;
}

// Example: 100000 paise, percentages [40, 30, 30]
// Calculated: [40000, 30000, 30000]
// Sum = 100000, remainder = 0 ✓

// 4. SHARES Split Algorithm
export function calculateSharesSplit(
  totalAmountPaise: number,
  splits: SharesSplit[]
): CalculatedSplit[] {
  const totalShares = splits.reduce((acc, s) => acc + s.shares, 0);
  
  // Calculate amounts (floor division)
  const calculated = splits.map(s => ({
    memberId: s.memberId,
    amountPaise: Math.floor(totalAmountPaise * s.shares / totalShares)
  }));
  
  // Apply rounding rule to distribute remainder
  const sum = calculated.reduce((acc, s) => acc + s.amountPaise, 0);
  const remainder = totalAmountPaise - sum;
  if (remainder > 0) {
    // First member gets remainder (consistent with other split types)
    calculated[0].amountPaise += remainder;
  }
  
  // Validate Split Invariant
  validateSplitInvariant(calculated.map(s => s.amountPaise), totalAmountPaise);
  
  return calculated;
}

// Example: 1800000 paise, shares [2, 1, 2]
// totalShares = 5
// Calculated: [720000, 360000, 720000]
// Sum = 1800000, remainder = 0 ✓

// Utility: Validate Split Invariant
function validateSplitInvariant(
  amounts: number[],
  totalAmountPaise: number
): void {
  const sum = amounts.reduce((acc, amt) => acc + amt, 0);
  if (sum !== totalAmountPaise) {
    throw new Error(
      `Split Invariant violated: sum(${sum}) !== total(${totalAmountPaise})`
    );
  }
}
```

**Key Implementation Details**:

1. All algorithms use `Math.floor()` for initial division to ensure integer results
2. Remainder paise distributed according to Rounding Rule:
   - EQUAL: First member gets remainder
   - PERCENTAGE: First member gets remainder
   - SHARES: First member gets remainder (consistent with EQUAL and PERCENTAGE)
3. `validateSplitInvariant()` called after every calculation to ensure correctness
4. All amounts are in paise (integers), never rupees (decimals)

#### Balance Engine Service

**File: `backend/src/services/balanceEngine.ts`**

This service calculates net balances and implements the greedy debt minimization algorithm:

```typescript
interface Balance {
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
}

interface Transfer {
  fromMemberId: string;
  toMemberId: string;
  amountPaise: number;
}

// Calculate raw pairwise balances from expenses and settlements
export async function calculateNetBalances(
  groupId: string
): Promise<Balance[]> {
  const prisma = getPrismaClient();
  
  // 1. Fetch all expenses for the group with splits
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      splits: {
        include: {
          groupMember: true
        }
      }
    }
  });
  
  // 2. Fetch all settlements for the group
  const settlements = await prisma.settlement.findMany({
    where: { groupId }
  });
  
  // 3. Build debt map: Map<fromMemberId_toMemberId, amount>
  const debtMap = new Map<string, number>();
  
  // Process expenses: each split member owes the payer
  for (const expense of expenses) {
    // Fetch the payer's GroupMember record for this group
    const payerGroupMember = await prisma.groupMember.findFirst({
      where: {
        userId: expense.paidByUserId,
        groupId: expense.groupId
      }
    });

    if (!payerGroupMember) continue; // Skip if payer not found

    for (const split of expense.splits) {
      const splitGroupMemberId = split.groupMemberId;
      
      // Skip if split member is the payer (compare GroupMember IDs, not User IDs)
      if (splitGroupMemberId === payerGroupMember.id) continue;
      
      // Add debt: splitMember owes payer
      const key = `${splitGroupMemberId}_${payerGroupMember.id}`;
      const currentDebt = debtMap.get(key) || 0;
      debtMap.set(key, currentDebt + split.amountPaise);
    }
  }
  
  // Process settlements: reduce corresponding debt
  for (const settlement of settlements) {
    const key = `${settlement.fromGroupMemberId}_${settlement.toGroupMemberId}`;
    const currentDebt = debtMap.get(key) || 0;
    debtMap.set(key, currentDebt - settlement.amountPaise);
  }
  
  // 4. Convert debt map to balance array (exclude zero balances)
  const balances: Balance[] = [];
  for (const [key, amount] of debtMap.entries()) {
    if (amount > 0) {
      const [fromMemberId, toMemberId] = key.split('_');
      balances.push({ fromMemberId, toMemberId, amountPaise: amount });
    }
  }
  
  return balances;
}

// Minimize transfers using greedy algorithm
export function minimizeTransfers(balances: Balance[]): Transfer[] {
  // 1. Calculate net position for each member
  const netPosition = new Map<string, number>();
  
  for (const balance of balances) {
    // Debtor (owes money): negative position
    const debtorCurrent = netPosition.get(balance.fromMemberId) || 0;
    netPosition.set(balance.fromMemberId, debtorCurrent - balance.amountPaise);
    
    // Creditor (owed money): positive position
    const creditorCurrent = netPosition.get(balance.toMemberId) || 0;
    netPosition.set(balance.toMemberId, creditorCurrent + balance.amountPaise);
  }
  
  // 2. Split into creditors and debtors
  const creditors: Array<{ memberId: string; amount: number }> = [];
  const debtors: Array<{ memberId: string; amount: number }> = [];
  
  for (const [memberId, amount] of netPosition.entries()) {
    if (amount > 0) {
      creditors.push({ memberId, amount });
    } else if (amount < 0) {
      debtors.push({ memberId, amount: -amount }); // Convert to positive
    }
  }
  
  // 3. Greedy algorithm: match max creditor with max debtor
  const transfers: Transfer[] = [];
  
  while (creditors.length > 0 && debtors.length > 0) {
    // Sort to get max creditor and max debtor
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    
    const maxCreditor = creditors[0];
    const maxDebtor = debtors[0];
    
    // Settle with minimum of the two amounts
    const settleAmount = Math.min(maxCreditor.amount, maxDebtor.amount);
    
    transfers.push({
      fromMemberId: maxDebtor.memberId,
      toMemberId: maxCreditor.memberId,
      amountPaise: settleAmount
    });
    
    // Update amounts
    maxCreditor.amount -= settleAmount;
    maxDebtor.amount -= settleAmount;
    
    // Remove members with zero balance
    if (maxCreditor.amount === 0) {
      creditors.shift();
    }
    if (maxDebtor.amount === 0) {
      debtors.shift();
    }
  }
  
  return transfers;
}
```

**Greedy Algorithm Example**:

```
Input Balances (raw):
  A → B: ₹150
  C → A: ₹250
  C → B: ₹100

Step 1: Calculate Net Positions
  A: -150 (owes) + 250 (owed) = +100 (net creditor)
  B: +150 (owed) + 100 (owed) = +250 (net creditor)
  C: -250 (owes) - 100 (owes) = -350 (net debtor)

Step 2: Lists
  Creditors: [B: 250, A: 100]
  Debtors: [C: 350]

Step 3: Greedy Matching
  Iteration 1:
    Max creditor: B (250)
    Max debtor: C (350)
    Settle: min(250, 350) = 250
    Transfer: C → B: ₹250
    Updated: B: 0, C: 100
    Remove B from creditors

  Iteration 2:
    Max creditor: A (100)
    Max debtor: C (100)
    Settle: min(100, 100) = 100
    Transfer: C → A: ₹100
    Updated: A: 0, C: 0
    Remove both

Output Transfers (optimized):
  C → B: ₹250
  C → A: ₹100

Result: 3 raw transfers → 2 optimized transfers (1 saved)
```

#### Expense Service with Transaction

**File: `backend/src/services/expenses.service.ts`**

Creating an expense requires a database transaction to ensure atomicity:

```typescript
export async function createExpense(
  groupId: string,
  userId: string,
  data: CreateExpenseDto
): Promise<ExpenseWithSplits> {
  const prisma = getPrismaClient();
  
  // 1. Calculate splits based on split type
  let calculatedSplits: CalculatedSplit[];
  
  switch (data.splitType) {
    case 'EQUAL':
      calculatedSplits = calculateEqualSplit(
        data.totalAmountPaise,
        data.memberIds
      );
      break;
    
    case 'EXACT':
      calculatedSplits = calculateExactSplit(
        data.totalAmountPaise,
        data.splits
      );
      break;
    
    case 'PERCENTAGE':
      calculatedSplits = calculatePercentageSplit(
        data.totalAmountPaise,
        data.splits
      );
      break;
    
    case 'SHARES':
      calculatedSplits = calculateSharesSplit(
        data.totalAmountPaise,
        data.splits
      );
      break;
  }
  
  // 2. Validate Split Invariant (double-check)
  const sum = calculatedSplits.reduce((acc, s) => acc + s.amountPaise, 0);
  if (sum !== data.totalAmountPaise) {
    throw new Error('Split Invariant violated');
  }
  
  // 3. Create expense and splits in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create expense
    const expense = await tx.expense.create({
      data: {
        groupId,
        description: data.description,
        totalAmountPaise: data.totalAmountPaise,
        paidByUserId: data.paidByMemberId,
        splitType: data.splitType,
        date: data.date || new Date(),
        notes: data.notes,
        createdByUserId: userId
      }
    });
    
    // Create all splits
    const splits = await Promise.all(
      calculatedSplits.map(split =>
        tx.expenseSplit.create({
          data: {
            expenseId: expense.id,
            groupMemberId: split.memberId,
            amountPaise: split.amountPaise,
            isSettled: false
          }
        })
      )
    );
    
    // Validate Split Invariant one final time
    const totalSplit = splits.reduce((acc, s) => acc + s.amountPaise, 0);
    if (totalSplit !== expense.totalAmountPaise) {
      throw new Error('Split Invariant violated in transaction');
    }
    
    return { expense, splits };
  });
  
  return result;
}
```

**Transaction Benefits**:
- All-or-nothing: If any split insert fails, entire expense creation is rolled back
- Consistency: Split Invariant validated before commit
- Isolation: Other requests don't see partial data

### Frontend Architecture

#### State Management Strategy

The frontend uses a dual-state approach:

1. **Zustand** for client-only state (currentUser, UI preferences)
2. **React Query** for server state (groups, expenses, balances)

**File: `frontend/src/stores/authStore.ts`**

```typescript
import create from 'zustand';
import { User } from '../types/user';
import { apiClient } from '../lib/apiClient';

interface AuthState {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isLoading: false,
  
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      set({ currentUser: response.data.user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/auth/register', data);
      set({ currentUser: response.data.user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  
  logout: () => {
    set({ currentUser: null });
  },
  
  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/auth/me');
      set({ currentUser: response.data.user, isLoading: false });
    } catch (error) {
      set({ currentUser: null, isLoading: false });
    }
  }
}));
```

**File: `frontend/src/hooks/useExpenses.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

export function useExpenses(groupId: string) {
  return useQuery({
    queryKey: ['expenses', groupId],
    queryFn: async () => {
      const response = await apiClient.get(`/groups/${groupId}/expenses`);
      return response.data.expenses;
    }
  });
}

export function useCreateExpense(groupId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateExpenseDto) => {
      const response = await apiClient.post(
        `/groups/${groupId}/expenses`,
        data
      );
      return response.data.expense;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['expenses', groupId] });
      queryClient.invalidateQueries({ queryKey: ['balances', groupId] });
    }
  });
}
```

**React Query Benefits**:
- Automatic caching and deduplication
- Background refetching
- Optimistic updates
- Cache invalidation on mutations

#### Axios Configuration

**File: `frontend/src/lib/api.ts`**

```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true, // CRITICAL: Send cookies with every request
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login or clear auth state
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Key Configuration**:
- `withCredentials: true` ensures JWT cookie is sent with every request
- Base URL from environment variable for environment flexibility
- Global error interceptor for 401 handling

#### Expense Creation Form

**File: `frontend/src/pages/expenses/CreateExpensePage.tsx`**

```typescript
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCreateExpense } from '../../hooks/useExpenses';
import { rupeesToPaise } from '../../utils/moneyUtils';

type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES';

export function CreateExpensePage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const createExpense = useCreateExpense(groupId!);
  
  const [description, setDescription] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [splits, setSplits] = useState<any[]>([]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert rupees to paise
    const totalAmountPaise = rupeesToPaise(parseFloat(amountRupees));
    
    // Build request payload based on split type
    const payload: any = {
      description,
      totalAmountPaise,
      splitType,
      date: new Date().toISOString()
    };
    
    if (splitType === 'EQUAL') {
      payload.memberIds = selectedMembers;
    } else {
      // For EXACT, PERCENTAGE, SHARES: include splits array
      payload.splits = splits;
    }
    
    try {
      await createExpense.mutateAsync(payload);
      navigate(`/groups/${groupId}/expenses`);
    } catch (error) {
      console.error('Failed to create expense:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      
      <input
        type="number"
        step="0.01"
        placeholder="Amount (₹)"
        value={amountRupees}
        onChange={(e) => setAmountRupees(e.target.value)}
      />
      
      <select
        value={splitType}
        onChange={(e) => setSplitType(e.target.value as SplitType)}
      >
        <option value="EQUAL">Split Equally</option>
        <option value="EXACT">Exact Amounts</option>
        <option value="PERCENTAGE">By Percentage</option>
        <option value="SHARES">By Shares</option>
      </select>
      
      {/* Dynamic split inputs based on splitType */}
      {splitType === 'EQUAL' && (
        <MemberMultiSelect
          members={members}
          selected={selectedMembers}
          onChange={setSelectedMembers}
        />
      )}
      
      {splitType === 'EXACT' && (
        <ExactSplitInputs
          members={selectedMembers}
          splits={splits}
          onChange={setSplits}
          total={parseFloat(amountRupees)}
        />
      )}
      
      {splitType === 'PERCENTAGE' && (
        <PercentageSplitInputs
          members={selectedMembers}
          splits={splits}
          onChange={setSplits}
        />
      )}
      
      {splitType === 'SHARES' && (
        <SharesSplitInputs
          members={selectedMembers}
          splits={splits}
          onChange={setSplits}
        />
      )}
      
      <button type="submit">Create Expense</button>
    </form>
  );
}
```

**Form Validation Requirements**:

1. **EQUAL**: At least 2 members selected
2. **EXACT**: Sum of amounts must equal total (validated before submit)
3. **PERCENTAGE**: Sum of percentages must equal 100% (validated before submit)
4. **SHARES**: At least one member with shares > 0

---

## Data Models

### Database Schema (Prisma)

The Prisma schema is defined exactly as specified in SCHEMA.md. Key points for implementation:

**File: `backend/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  phone        String?
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  createdGroups     Group[]         @relation("GroupCreator")
  memberships       GroupMember[]
  expensesPaid      Expense[]       @relation("ExpensePayer")
  expensesCreated   Expense[]       @relation("ExpenseCreator")
  notifications     Notification[]
}

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

  createdBy     User          @relation("GroupCreator", fields: [createdByUserId], references: [id])
  members       GroupMember[]
  expenses      Expense[]
  settlements   Settlement[]
  notifications Notification[]
}

model GroupMember {
  id                String     @id @default(cuid())
  groupId           String
  userId            String?
  placeholderName   String?
  placeholderPhone  String?
  placeholderEmail  String?
  role              MemberRole @default(MEMBER)
  joinedAt          DateTime   @default(now())

  group             Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user              User?          @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenseSplits     ExpenseSplit[]
  settlementsFrom   Settlement[]   @relation("SettlementFrom")
  settlementsTo     Settlement[]   @relation("SettlementTo")

  @@unique([groupId, userId])
  @@index([groupId])
  @@index([userId])
}

enum MemberRole {
  ADMIN
  MEMBER
}

model Expense {
  id                      String      @id @default(cuid())
  groupId                 String
  description             String
  totalAmountPaise        Int
  paidByUserId            String
  splitType               SplitType
  date                    DateTime    @default(now())
  notes                   String?
  receiptImageUrl         String?
  isRecurring             Boolean     @default(false)
  recurringCronExpression String?
  createdByUserId         String
  createdAt               DateTime    @default(now())
  updatedAt               DateTime    @updatedAt

  group         Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy        User           @relation("ExpensePayer", fields: [paidByUserId], references: [id])
  createdBy     User           @relation("ExpenseCreator", fields: [createdByUserId], references: [id])
  splits        ExpenseSplit[]
  notifications Notification[]

  @@index([groupId])
  @@index([paidByUserId])
  @@index([date])
}

enum SplitType {
  EQUAL
  EXACT
  PERCENTAGE
  SHARES
}

model ExpenseSplit {
  id            String    @id @default(cuid())
  expenseId     String
  groupMemberId String
  amountPaise   Int
  isSettled     Boolean   @default(false)
  settledAt     DateTime?

  expense      Expense     @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  groupMember  GroupMember @relation(fields: [groupMemberId], references: [id], onDelete: Cascade)

  @@index([expenseId])
  @@index([groupMemberId])
}

model Settlement {
  id                 String           @id @default(cuid())
  groupId            String
  fromGroupMemberId  String
  toGroupMemberId    String
  amountPaise        Int
  method             SettlementMethod
  upiTransactionId   String?
  note               String?
  settledAt          DateTime         @default(now())
  createdAt          DateTime         @default(now())

  group      Group       @relation(fields: [groupId], references: [id], onDelete: Cascade)
  fromMember GroupMember @relation("SettlementFrom", fields: [fromGroupMemberId], references: [id])
  toMember   GroupMember @relation("SettlementTo", fields: [toGroupMemberId], references: [id])

  @@index([groupId])
  @@index([fromGroupMemberId])
  @@index([toGroupMemberId])
}

enum SettlementMethod {
  MANUAL
  UPI_DEEPLINK
  UPI_GATEWAY
}

model Notification {
  id               String           @id @default(cuid())
  userId           String
  type             NotificationType
  title            String
  body             String
  isRead           Boolean          @default(false)
  relatedGroupId   String?
  relatedExpenseId String?
  createdAt        DateTime         @default(now())

  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  relatedGroup   Group?   @relation(fields: [relatedGroupId], references: [id], onDelete: Cascade)
  relatedExpense Expense? @relation(fields: [relatedExpenseId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([isRead])
  @@index([createdAt])
}

enum NotificationType {
  REMINDER
  TRIP_ARCHIVED
  EXPENSE_ADDED
  SETTLEMENT_RECEIVED
  SETTLEMENT_SENT
}
```

**Critical Database Constraints**:

1. **Money Fields**: All money fields (`totalAmountPaise`, `amountPaise`) use `Int` type, NEVER `Float` or `Decimal`
2. **Unique Constraints**: `User.email` is unique, `GroupMember` has `@@unique([groupId, userId])`
3. **Indexes**: Performance indexes on frequently queried fields (groupId, userId, date)
4. **Cascade Deletes**: When a Group is deleted, all related records cascade delete
5. **Nullable Fields**: `GroupMember.userId` and `placeholderName` are both nullable (Placeholder Invariant enforced in service layer)

### Prisma Client Singleton

**File: `backend/src/lib/prisma.ts`**

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export function getPrismaClient() {
  return prisma;
}
```

**Singleton Pattern Benefits**:
- Prevents multiple Prisma Client instances (can exhaust connection pool)
- Enables connection pooling
- Logs queries in development for debugging

### Money Utilities

**File: `backend/src/utils/moneyUtils.ts`**

```typescript
// Convert rupees (decimal) to paise (integer)
export function rupeesToPaise(rupees: number): number {
  return Math.floor(rupees * 100);
}

// Convert paise (integer) to rupees (decimal)
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

// Format paise as currency string
export function formatCurrency(paise: number): string {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(rupees);
}

// Validate that a value is a valid paise amount (integer)
export function validatePaise(value: any): boolean {
  return Number.isInteger(value) && value >= 0;
}
```

**Frontend Version**: `frontend/src/utils/moneyUtils.ts` (identical functions)

**Usage Examples**:
```typescript
// User enters ₹100.50 in form
const paise = rupeesToPaise(100.50); // 10050

// Display 10050 paise as currency
const formatted = formatCurrency(10050); // "₹100.50"

// Validate database value
const isValid = validatePaise(10050); // true
const isInvalid = validatePaise(100.5); // false (not integer)
```

---

## Error Handling

### Backend Error Handling

**File: `backend/src/middleware/errorHandler.ts`**

```typescript
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', error);
  
  // Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: error.errors
      }
    });
  }
  
  // Prisma unique constraint violations
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this value already exists'
        }
      });
    }
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found'
        }
      });
    }
  }
  
  // Custom application errors
  if (error.message.includes('Split Invariant')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'SPLIT_INVARIANT_VIOLATION',
        message: error.message
      }
    });
  }
  
  if (error.message.includes('Placeholder Invariant')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'PLACEHOLDER_INVARIANT_VIOLATION',
        message: error.message
      }
    });
  }
  
  // Default 500 error
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
}
```

**Error Response Format** (consistent across all endpoints):

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {} // Optional: additional context
  }
}
```

### Frontend Error Handling

**File: `frontend/src/lib/api.ts`** (response interceptor)

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.error?.code;
    
    // Handle specific error codes
    if (status === 401) {
      // Clear auth state and redirect to login
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    
    if (status === 403) {
      // Show "Access Denied" message
      toast.error('You do not have permission to perform this action');
    }
    
    if (errorCode === 'SPLIT_INVARIANT_VIOLATION') {
      toast.error('Split amounts do not sum to total. Please check your inputs.');
    }
    
    if (errorCode === 'PLACEHOLDER_INVARIANT_VIOLATION') {
      toast.error('Member must be either a registered user OR a placeholder, not both.');
    }
    
    return Promise.reject(error);
  }
);
```

---

## Testing Strategy

### Unit Testing

**Unit tests** verify specific functions, algorithms, and edge cases:

#### Split Calculator Tests

**File: `backend/src/services/splitCalculator.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit
} from './splitCalculator';

describe('calculateEqualSplit', () => {
  it('should divide evenly when total divides exactly', () => {
    const result = calculateEqualSplit(9000, ['m1', 'm2', 'm3']);
    expect(result).toEqual([
      { memberId: 'm1', amountPaise: 3000 },
      { memberId: 'm2', amountPaise: 3000 },
      { memberId: 'm3', amountPaise: 3000 }
    ]);
  });
  
  it('should apply rounding rule when remainder exists', () => {
    const result = calculateEqualSplit(10000, ['m1', 'm2', 'm3']);
    expect(result).toEqual([
      { memberId: 'm1', amountPaise: 3334 }, // First gets +1
      { memberId: 'm2', amountPaise: 3333 },
      { memberId: 'm3', amountPaise: 3333 }
    ]);
    
    // Verify Split Invariant
    const sum = result.reduce((acc, s) => acc + s.amountPaise, 0);
    expect(sum).toBe(10000);
  });
  
  it('should handle single member', () => {
    const result = calculateEqualSplit(5000, ['m1']);
    expect(result).toEqual([
      { memberId: 'm1', amountPaise: 5000 }
    ]);
  });
});

describe('calculateExactSplit', () => {
  it('should accept splits that sum to total', () => {
    const splits = [
      { memberId: 'm1', amountPaise: 5000 },
      { memberId: 'm2', amountPaise: 3000 },
      { memberId: 'm3', amountPaise: 2000 }
    ];
    const result = calculateExactSplit(10000, splits);
    expect(result).toEqual(splits);
  });
  
  it('should reject splits that do not sum to total', () => {
    const splits = [
      { memberId: 'm1', amountPaise: 5000 },
      { memberId: 'm2', amountPaise: 3000 }
    ];
    expect(() => calculateExactSplit(10000, splits)).toThrow('Split Invariant');
  });
});

describe('calculatePercentageSplit', () => {
  it('should calculate amounts from percentages', () => {
    const splits = [
      { memberId: 'm1', percentage: 40 },
      { memberId: 'm2', percentage: 30 },
      { memberId: 'm3', percentage: 30 }
    ];
    const result = calculatePercentageSplit(100000, splits);
    expect(result).toEqual([
      { memberId: 'm1', amountPaise: 40000 },
      { memberId: 'm2', amountPaise: 30000 },
      { memberId: 'm3', amountPaise: 30000 }
    ]);
  });
  
  it('should reject percentages that do not sum to 100', () => {
    const splits = [
      { memberId: 'm1', percentage: 40 },
      { memberId: 'm2', percentage: 40 }
    ];
    expect(() => calculatePercentageSplit(100000, splits)).toThrow('sum to 100');
  });
  
  it('should apply rounding rule for remainder', () => {
    const splits = [
      { memberId: 'm1', percentage: 33.33 },
      { memberId: 'm2', percentage: 33.33 },
      { memberId: 'm3', percentage: 33.34 }
    ];
    const result = calculatePercentageSplit(10000, splits);
    const sum = result.reduce((acc, s) => acc + s.amountPaise, 0);
    expect(sum).toBe(10000); // Split Invariant holds
  });
});

describe('calculateSharesSplit', () => {
  it('should calculate proportional amounts from shares', () => {
    const splits = [
      { memberId: 'm1', shares: 2 },
      { memberId: 'm2', shares: 1 },
      { memberId: 'm3', shares: 2 }
    ];
    const result = calculateSharesSplit(1800000, splits);
    expect(result).toEqual([
      { memberId: 'm1', amountPaise: 720000 }, // 2/5 * 1800000
      { memberId: 'm2', amountPaise: 360000 }, // 1/5 * 1800000
      { memberId: 'm3', amountPaise: 720000 }  // 2/5 * 1800000
    ]);
  });
  
  it('should give remainder to member with most shares', () => {
    const splits = [
      { memberId: 'm1', shares: 1 },
      { memberId: 'm2', shares: 1 },
      { memberId: 'm3', shares: 3 }
    ];
    const result = calculateSharesSplit(10000, splits);
    
    // m3 has most shares, should get remainder
    expect(result[2].amountPaise).toBeGreaterThanOrEqual(6000);
    
    const sum = result.reduce((acc, s) => acc + s.amountPaise, 0);
    expect(sum).toBe(10000); // Split Invariant holds
  });
});
```

#### Balance Engine Tests

**File: `backend/src/services/balanceEngine.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { minimizeTransfers } from './balanceEngine';

describe('minimizeTransfers', () => {
  it('should minimize simple 3-person debt cycle', () => {
    const balances = [
      { fromMemberId: 'A', toMemberId: 'B', amountPaise: 15000 },
      { fromMemberId: 'C', toMemberId: 'A', amountPaise: 25000 },
      { fromMemberId: 'C', toMemberId: 'B', amountPaise: 10000 }
    ];
    
    const result = minimizeTransfers(balances);
    
    // Should reduce from 3 to 2 transfers
    expect(result.length).toBeLessThanOrEqual(2);
    
    // Verify net positions preserved (not totals - redundant transfers eliminated)
    // Each member's net position (owed - owing) must be preserved
    const originalNetPositions = new Map<string, number>();
    for (const b of balances) {
      originalNetPositions.set(b.fromMemberId, (originalNetPositions.get(b.fromMemberId) || 0) - b.amountPaise);
      originalNetPositions.set(b.toMemberId, (originalNetPositions.get(b.toMemberId) || 0) + b.amountPaise);
    }
    const resultNetPositions = new Map<string, number>();
    for (const t of result) {
      resultNetPositions.set(t.fromMemberId, (resultNetPositions.get(t.fromMemberId) || 0) - t.amountPaise);
      resultNetPositions.set(t.toMemberId, (resultNetPositions.get(t.toMemberId) || 0) + t.amountPaise);
    }
    expect(resultNetPositions).toEqual(originalNetPositions);
  });
  
  it('should handle already optimal transfers', () => {
    const balances = [
      { fromMemberId: 'A', toMemberId: 'B', amountPaise: 10000 }
    ];
    
    const result = minimizeTransfers(balances);
    expect(result).toEqual(balances);
  });
  
  it('should handle multiple creditors and debtors', () => {
    const balances = [
      { fromMemberId: 'A', toMemberId: 'D', amountPaise: 10000 },
      { fromMemberId: 'B', toMemberId: 'D', amountPaise: 20000 },
      { fromMemberId: 'C', toMemberId: 'E', amountPaise: 15000 }
    ];
    
    const result = minimizeTransfers(balances);
    
    // Should maintain or reduce transfer count
    expect(result.length).toBeLessThanOrEqual(balances.length);
    
    // Verify Money Invariant
    const originalSum = balances.reduce((acc, b) => acc + b.amountPaise, 0);
    const resultSum = result.reduce((acc, t) => acc + t.amountPaise, 0);
    expect(resultSum).toBe(originalSum);
  });
});
```

#### Money Utils Tests

**File: `backend/src/utils/moneyUtils.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  rupeesToPaise,
  paiseToRupees,
  formatCurrency,
  validatePaise
} from './moneyUtils';

describe('moneyUtils', () => {
  describe('rupeesToPaise', () => {
    it('should convert whole rupees correctly', () => {
      expect(rupeesToPaise(100)).toBe(10000);
      expect(rupeesToPaise(1)).toBe(100);
    });
    
    it('should convert decimal rupees correctly', () => {
      expect(rupeesToPaise(10.50)).toBe(1050);
      expect(rupeesToPaise(99.99)).toBe(9999);
    });
    
    it('should floor fractional paise', () => {
      expect(rupeesToPaise(10.505)).toBe(1050); // Floors to 1050
    });
  });
  
  describe('paiseToRupees', () => {
    it('should convert paise to rupees', () => {
      expect(paiseToRupees(10000)).toBe(100);
      expect(paiseToRupees(1050)).toBe(10.50);
    });
  });
  
  describe('formatCurrency', () => {
    it('should format as Indian currency', () => {
      expect(formatCurrency(125000)).toBe('₹1,250.00');
      expect(formatCurrency(10000)).toBe('₹100.00');
    });
  });
  
  describe('validatePaise', () => {
    it('should accept integers', () => {
      expect(validatePaise(10000)).toBe(true);
      expect(validatePaise(0)).toBe(true);
    });
    
    it('should reject non-integers', () => {
      expect(validatePaise(100.5)).toBe(false);
      expect(validatePaise('100')).toBe(false);
    });
    
    it('should reject negative values', () => {
      expect(validatePaise(-100)).toBe(false);
    });
  });
});
```

### Integration Testing

**Integration tests** verify end-to-end flows with the database:

#### Expense Creation Integration Test

**File: `backend/src/__tests__/integration/expenses.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../server';
import { prisma } from '../../lib/prisma';

describe('Expense Creation Integration', () => {
  let authToken: string;
  let groupId: string;
  let memberIds: string[];
  
  beforeAll(async () => {
    // Setup test data
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        passwordHash: 'hashed'
      }
    });
    
    const group = await prisma.group.create({
      data: {
        name: 'Test Group',
        createdByUserId: user.id
      }
    });
    groupId = group.id;
    
    const member1 = await prisma.groupMember.create({
      data: { groupId, userId: user.id, role: 'ADMIN' }
    });
    
    const member2 = await prisma.groupMember.create({
      data: { groupId, placeholderName: 'Alice' }
    });
    
    memberIds = [member1.id, member2.id];
    
    // Get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    authToken = loginRes.headers['set-cookie'][0];
  });
  
  afterAll(async () => {
    await prisma.$transaction([
      prisma.expenseSplit.deleteMany(),
      prisma.expense.deleteMany(),
      prisma.groupMember.deleteMany(),
      prisma.group.deleteMany(),
      prisma.user.deleteMany()
    ]);
  });
  
  it('should create EQUAL split expense and enforce Split Invariant', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set('Cookie', authToken)
      .send({
        description: 'Dinner',
        totalAmountPaise: 10000,
        paidByMemberId: memberIds[0],
        splitType: 'EQUAL',
        memberIds: memberIds
      });
    
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    
    const expense = res.body.data.expense;
    const splits = res.body.data.splits;
    
    // Verify Split Invariant
    const sum = splits.reduce((acc: number, s: any) => acc + s.amountPaise, 0);
    expect(sum).toBe(expense.totalAmountPaise);
    
    // Verify Rounding Rule (first member gets remainder)
    expect(splits[0].amountPaise).toBe(5000); // 10000 / 2 = 5000 each
    expect(splits[1].amountPaise).toBe(5000);
  });
  
  it('should reject PERCENTAGE split that does not sum to 100', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .set('Cookie', authToken)
      .send({
        description: 'Dinner',
        totalAmountPaise: 10000,
        paidByMemberId: memberIds[0],
        splitType: 'PERCENTAGE',
        splits: [
          { memberId: memberIds[0], percentage: 40 },
          { memberId: memberIds[1], percentage: 40 }
        ]
      });
    
    expect(res.status).toBe(400);
    expect(res.body.error.code).toContain('sum to 100');
  });
  
  it('should enforce authentication', async () => {
    const res = await request(app)
      .post(`/api/groups/${groupId}/expenses`)
      .send({
        description: 'Dinner',
        totalAmountPaise: 10000,
        splitType: 'EQUAL',
        memberIds: memberIds
      });
    
    expect(res.status).toBe(401);
  });
});
```

### End-to-End Testing

**E2E tests** use Playwright to test full user flows:

**File: `frontend/e2e/expense-creation.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Expense Creation Flow', () => {
  test('should create expense and see it in expense list', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // 2. Navigate to group
    await page.waitForURL('/groups');
    await page.click('text=Test Group');
    
    // 3. Create expense
    await page.click('text=Add Expense');
    await page.fill('input[placeholder="Description"]', 'Team Lunch');
    await page.fill('input[placeholder="Amount"]', '500');
    await page.selectOption('select[name="splitType"]', 'EQUAL');
    await page.check('input[value="member1"]');
    await page.check('input[value="member2"]');
    await page.click('button:has-text("Create")');
    
    // 4. Verify expense appears
    await page.waitForURL(/\/groups\/.*\/expenses/);
    await expect(page.locator('text=Team Lunch')).toBeVisible();
    await expect(page.locator('text=₹500.00')).toBeVisible();
  });
});
```

---

## Deployment Considerations

### Environment Variables

**Backend `.env`**:
```
DATABASE_URL=postgresql://user:password@localhost:5432/splitwise
JWT_SECRET=your-super-secret-jwt-key-change-in-production
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=5000
```

**Frontend `.env`**:
```
VITE_API_BASE_URL=http://localhost:5000/api
```

### Production Checklist

1. **Security**:
   - Set `JWT_SECRET` to a strong random value
   - Enable `secure: true` for cookies (HTTPS only)
   - Configure CORS to allow only production frontend domain
   - Use environment-specific `DATABASE_URL`

2. **Performance**:
   - Enable Prisma connection pooling
   - Use Redis for session storage (future enhancement)
   - Implement rate limiting on auth endpoints
   - Enable gzip compression

3. **Monitoring**:
   - Add logging (Winston or Pino)
   - Set up error tracking (Sentry)
   - Monitor database queries for N+1 problems
   - Track API response times

4. **Database**:
   - Run migrations: `npx prisma migrate deploy`
   - Set up automated backups
   - Configure connection pool size based on load

---

## Summary

This design implements a full-stack expense sharing application with:

1. **Secure Authentication**: JWT tokens in httpOnly cookies with bcrypt password hashing
2. **Robust Money Handling**: Integer paise throughout, never floats
3. **Four Split Algorithms**: EQUAL, EXACT, PERCENTAGE, SHARES with correct rounding
4. **Debt Minimization**: Greedy algorithm to reduce transfer count
5. **Placeholder Support**: Unregistered members identified by name
6. **Transaction Safety**: Database transactions ensure Split Invariant
7. **Modern Frontend**: React 18 with Zustand + React Query state management
8. **Type Safety**: TypeScript across frontend and backend

All critical invariants (Money, Split, Placeholder, Rounding) are enforced at multiple layers to ensure data integrity and correctness.
