# Splitwise 2.0 — API Contract

This document defines every REST API endpoint the backend will expose. All endpoints follow RESTful conventions and return JSON responses. All money amounts are expressed in integer paise (₹1 = 100 paise) to avoid floating-point errors.

---

## API Base URL

- **Local Development**: `http://localhost:5000/api`
- **Production**: `https://api.splitwise2.example.com/api`

---

## Response Format Standards

All endpoints return responses in this format:

**Success Response (2xx)**:
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

**Error Response (4xx / 5xx)**:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

---

## Authentication

Most endpoints require authentication via JWT tokens stored in httpOnly cookies. When authentication is required, requests must include the JWT cookie set during login.

**Error Codes**:
- `401` — Unauthorized (no token or invalid token)
- `403` — Forbidden (valid token but insufficient permissions)

---

# API Endpoints

## Auth — /api/auth

### POST /api/auth/register

**Purpose**: Create a new user account.

**Auth required**: No

**Request body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "phone": "+919876543210"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxyz123abc",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543210",
      "avatarUrl": null,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```
_Sets httpOnly cookie with JWT token._

**Error responses**:
- `400` — Invalid request (missing fields, invalid email format, weak password)
- `409` — Email already exists

---

### POST /api/auth/login

**Purpose**: Authenticate a user and issue a JWT token.

**Auth required**: No

**Request body**:
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxyz123abc",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543210",
      "avatarUrl": null,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```
_Sets httpOnly cookie with JWT token._

**Error responses**:
- `400` — Invalid request (missing fields)
- `401` — Invalid credentials

---

### POST /api/auth/logout

**Purpose**: Invalidate the current JWT token.

**Auth required**: Yes

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```
_Clears the httpOnly JWT cookie._

**Error responses**:
- `401` — Not authenticated

---

### GET /api/auth/me

**Purpose**: Get the currently authenticated user's profile.

**Auth required**: Yes

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clxyz123abc",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+919876543210",
      "avatarUrl": null,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

**Error responses**:
- `401` — Not authenticated

---

## Groups — /api/groups

### POST /api/groups

**Purpose**: Create a new group.

**Auth required**: Yes

**Request body**:
```json
{
  "name": "Goa Trip 2024",
  "description": "Beach vacation with college friends",
  "isTrip": true,
  "tripEndDate": "2024-02-28T23:59:59Z",
  "defaultCurrency": "INR"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "group": {
      "id": "grp_abc123",
      "name": "Goa Trip 2024",
      "description": "Beach vacation with college friends",
      "createdByUserId": "clxyz123abc",
      "isTrip": true,
      "tripEndDate": "2024-02-28T23:59:59Z",
      "isArchived": false,
      "defaultCurrency": "INR",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```
_The creator is automatically added as an ADMIN member._

**Error responses**:
- `400` — Invalid request (missing name, invalid date format)
- `401` — Not authenticated

---

### GET /api/groups

**Purpose**: List all groups the authenticated user is a member of.

**Auth required**: Yes

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "id": "grp_abc123",
        "name": "Goa Trip 2024",
        "description": "Beach vacation with college friends",
        "isTrip": true,
        "isArchived": false,
        "memberCount": 5,
        "myRole": "ADMIN",
        "createdAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": "grp_xyz789",
        "name": "Roommates",
        "description": null,
        "isTrip": false,
        "isArchived": false,
        "memberCount": 3,
        "myRole": "MEMBER",
        "createdAt": "2023-06-10T08:00:00Z"
      }
    ]
  }
}
```

**Error responses**:
- `401` — Not authenticated

---

### GET /api/groups/:groupId

**Purpose**: Get detailed information about a specific group.

**Auth required**: Yes

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "group": {
      "id": "grp_abc123",
      "name": "Goa Trip 2024",
      "description": "Beach vacation with college friends",
      "createdByUserId": "clxyz123abc",
      "isTrip": true,
      "tripEndDate": "2024-02-28T23:59:59Z",
      "isArchived": false,
      "defaultCurrency": "INR",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "members": [
        {
          "id": "mem_001",
          "userId": "clxyz123abc",
          "userName": "John Doe",
          "role": "ADMIN",
          "isPlaceholder": false
        },
        {
          "id": "mem_002",
          "userId": null,
          "placeholderName": "Amit Kumar",
          "placeholderPhone": "+919876543210",
          "role": "MEMBER",
          "isPlaceholder": true
        }
      ]
    }
  }
}
```

**Error responses**:
- `401` — Not authenticated
- `403` — Not a member of this group
- `404` — Group not found

---

### PATCH /api/groups/:groupId

**Purpose**: Edit group details (name, description, trip settings, currency).

**Auth required**: Yes (must be ADMIN of the group)

**Request body**:
```json
{
  "name": "Goa Beach Trip 2024",
  "description": "Updated description",
  "tripEndDate": "2024-03-05T23:59:59Z",
  "defaultCurrency": "INR"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "group": {
      "id": "grp_abc123",
      "name": "Goa Beach Trip 2024",
      "description": "Updated description",
      "tripEndDate": "2024-03-05T23:59:59Z",
      "updatedAt": "2024-01-16T14:20:00Z"
    }
  }
}
```

**Error responses**:
- `400` — Invalid request
- `401` — Not authenticated
- `403` — Not an admin of this group
- `404` — Group not found

---

### DELETE /api/groups/:groupId

**Purpose**: Soft-delete (archive) a group.

**Auth required**: Yes (must be ADMIN of the group)

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "Group archived successfully"
  }
}
```

**Error responses**:
- `401` — Not authenticated
- `403` — Not an admin of this group
- `404` — Group not found

---

### POST /api/groups/:groupId/archive

**Purpose**: Manually archive a trip group and trigger summary generation.

**Auth required**: Yes (must be ADMIN of the group)

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "Trip archived successfully",
    "summary": {
      "totalExpenses": 45,
      "totalAmountPaise": 12450000,
      "totalSettlements": 8,
      "dateRange": {
        "start": "2024-01-15T00:00:00Z",
        "end": "2024-02-28T23:59:59Z"
      }
    }
  }
}
```

**Error responses**:
- `400` — Group is not a trip group
- `401` — Not authenticated
- `403` — Not an admin of this group
- `404` — Group not found

---

## Members — /api/groups/:groupId/members

### POST /api/groups/:groupId/members

**Purpose**: Add a member to a group — either a real user by email, or a placeholder by name + contact info.

**Auth required**: Yes (must be a member of the group)

**Request body (real user)**:
```json
{
  "email": "alice@example.com",
  "role": "MEMBER"
}
```

**Request body (placeholder member)**:
```json
{
  "placeholderName": "Rahul Singh",
  "placeholderPhone": "+919123456789",
  "placeholderEmail": "rahul@example.com",
  "role": "MEMBER"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "mem_003",
      "groupId": "grp_abc123",
      "userId": "clusr789xyz",
      "userName": "Alice Smith",
      "role": "MEMBER",
      "isPlaceholder": false,
      "joinedAt": "2024-01-16T15:00:00Z"
    }
  }
}
```

**Error responses**:
- `400` — Invalid request (both userId and placeholderName null, or both non-null)
- `401` — Not authenticated
- `403` — Not a member of this group
- `404` — Group not found or user email not found
- `409` — User already a member of this group

---

### GET /api/groups/:groupId/members

**Purpose**: List all members of a group.

**Auth required**: Yes (must be a member of the group)

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "mem_001",
        "userId": "clxyz123abc",
        "userName": "John Doe",
        "userEmail": "john@example.com",
        "role": "ADMIN",
        "isPlaceholder": false,
        "joinedAt": "2024-01-15T10:30:00Z"
      },
      {
        "id": "mem_002",
        "userId": null,
        "placeholderName": "Amit Kumar",
        "placeholderPhone": "+919876543210",
        "placeholderEmail": null,
        "role": "MEMBER",
        "isPlaceholder": true,
        "joinedAt": "2024-01-15T11:00:00Z"
      }
    ]
  }
}
```

**Error responses**:
- `401` — Not authenticated
- `403` — Not a member of this group
- `404` — Group not found

---

### DELETE /api/groups/:groupId/members/:memberId

**Purpose**: Remove a member from a group (only if they have zero balance).

**Auth required**: Yes (must be ADMIN of the group)

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "Member removed successfully"
  }
}
```

**Error responses**:
- `400` — Member has non-zero balance
- `401` — Not authenticated
- `403` — Not an admin of this group
- `404` — Group or member not found

---

## Expenses — /api/groups/:groupId/expenses

### POST /api/groups/:groupId/expenses

**Purpose**: Create a new expense with splits. The request body varies based on `splitType`.

**Auth required**: Yes (must be a member of the group)

**Example 1 — EQUAL split**:
```json
{
  "description": "Dinner at restaurant",
  "totalAmountPaise": 90000,
  "paidByMemberId": "mem_001",
  "splitType": "EQUAL",
  "date": "2024-01-20T19:30:00Z",
  "notes": "Italian place near beach",
  "memberIds": ["mem_001", "mem_002", "mem_003"]
}
```
_Total: ₹900.00 split equally among 3 members → [30000, 30000, 30000] paise._

**Example 2 — EXACT split**:
```json
{
  "description": "Grocery shopping",
  "totalAmountPaise": 125000,
  "paidByMemberId": "mem_001",
  "splitType": "EXACT",
  "date": "2024-01-21T10:00:00Z",
  "splits": [
    { "memberId": "mem_001", "amountPaise": 50000 },
    { "memberId": "mem_002", "amountPaise": 40000 },
    { "memberId": "mem_003", "amountPaise": 35000 }
  ]
}
```
_Total: ₹1,250.00 with explicit amounts per member. Sum must equal total._

**Example 3 — PERCENTAGE split**:
```json
{
  "description": "Cab to airport",
  "totalAmountPaise": 100000,
  "paidByMemberId": "mem_002",
  "splitType": "PERCENTAGE",
  "date": "2024-01-22T06:00:00Z",
  "splits": [
    { "memberId": "mem_001", "percentage": 40.0 },
    { "memberId": "mem_002", "percentage": 30.0 },
    { "memberId": "mem_003", "percentage": 30.0 }
  ]
}
```
_Total: ₹1,000.00 split by percentage. Percentages must sum to 100.0._
_Calculated amounts: [40000, 30000, 30000] paise with rounding applied if needed._

**Example 4 — SHARES split**:
```json
{
  "description": "Hotel room (3 nights)",
  "totalAmountPaise": 1800000,
  "paidByMemberId": "mem_003",
  "splitType": "SHARES",
  "date": "2024-01-23T12:00:00Z",
  "splits": [
    { "memberId": "mem_001", "shares": 2 },
    { "memberId": "mem_002", "shares": 1 },
    { "memberId": "mem_003", "shares": 2 }
  ]
}
```
_Total: ₹18,000.00 split by shares (2:1:2 ratio). Total shares = 5._
_Calculated amounts: [720000, 360000, 720000] paise with rounding applied if needed._

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "expense": {
      "id": "exp_xyz123",
      "groupId": "grp_abc123",
      "description": "Dinner at restaurant",
      "totalAmountPaise": 90000,
      "paidByUserId": "clxyz123abc",
      "splitType": "EQUAL",
      "date": "2024-01-20T19:30:00Z",
      "notes": "Italian place near beach",
      "receiptImageUrl": null,
      "createdAt": "2024-01-20T20:00:00Z",
      "splits": [
        {
          "id": "split_001",
          "groupMemberId": "mem_001",
          "amountPaise": 30000,
          "isSettled": false
        },
        {
          "id": "split_002",
          "groupMemberId": "mem_002",
          "amountPaise": 30000,
          "isSettled": false
        },
        {
          "id": "split_003",
          "groupMemberId": "mem_003",
          "amountPaise": 30000,
          "isSettled": false
        }
      ]
    }
  }
}
```

**Error responses**:
- `400` — Invalid request (split amounts don't sum to total, percentages don't sum to 100, missing required fields)
- `401` — Not authenticated
- `403` — Not a member of this group
- `404` — Group not found or member IDs not found

---

### GET /api/groups/:groupId/expenses

**Purpose**: List all expenses in a group with pagination and optional date filtering.

**Auth required**: Yes (must be a member of the group)

**Query parameters**:
- `page` (optional, default: 1) — Page number
- `limit` (optional, default: 20) — Items per page
- `startDate` (optional) — ISO date string
- `endDate` (optional) — ISO date string

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "expenses": [
      {
        "id": "exp_xyz123",
        "description": "Dinner at restaurant",
        "totalAmountPaise": 90000,
        "paidByMemberName": "John Doe",
        "splitType": "EQUAL",
        "date": "2024-01-20T19:30:00Z",
        "splitCount": 3,
        "createdAt": "2024-01-20T20:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

**Error responses**:
- `401` — Not authenticated
- `403` — Not a member of this group
- `404` — Group not found

---

### GET /api/groups/:groupId/expenses/:expenseId

**Purpose**: Get detailed information about a specific expense including all splits.

**Auth required**: Yes (must be a member of the group)

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "expense": {
      "id": "exp_xyz123",
      "groupId": "grp_abc123",
      "description": "Dinner at restaurant",
      "totalAmountPaise": 90000,
      "paidByMemberId": "mem_001",
      "paidByMemberName": "John Doe",
      "splitType": "EQUAL",
      "date": "2024-01-20T19:30:00Z",
      "notes": "Italian place near beach",
      "receiptImageUrl": null,
      "isRecurring": false,
      "createdAt": "2024-01-20T20:00:00Z",
      "splits": [
        {
          "id": "split_001",
          "groupMemberId": "mem_001",
          "memberName": "John Doe",
          "amountPaise": 30000,
          "isSettled": false,
          "settledAt": null
        },
        {
          "id": "split_002",
          "groupMemberId": "mem_002",
          "memberName": "Amit Kumar",
          "amountPaise": 30000,
          "isSettled": false,
          "settledAt": null
        },
        {
          "id": "split_003",
          "groupMemberId": "mem_003",
          "memberName": "Alice Smith",
          "amountPaise": 30000,
          "isSettled": false,
          "settledAt": null
        }
      ]
    }
  }
}
```

**Error responses**:
- `401` — Not authenticated
- `403` — Not a member of this group
- `404` — Group or expense not found

---

### PATCH /api/groups/:groupId/expenses/:expenseId

**Purpose**: Edit an existing expense (creates an edit history entry for audit trail).

**Auth required**: Yes (must be ADMIN or the creator of the expense)

**Request body**:
```json
{
  "description": "Updated dinner description",
  "totalAmountPaise": 95000,
  "notes": "Added dessert to the bill"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "expense": {
      "id": "exp_xyz123",
      "description": "Updated dinner description",
      "totalAmountPaise": 95000,
      "notes": "Added dessert to the bill",
      "updatedAt": "2024-01-21T09:00:00Z"
    }
  }
}
```

**Error responses**:
- `400` — Invalid request
- `401` — Not authenticated
- `403` — Not authorized to edit this expense
- `404` — Group or expense not found

---

### DELETE /api/groups/:groupId/expenses/:expenseId

**Purpose**: Soft-delete an expense (removes it from normal views but keeps for audit).

**Auth required**: Yes (must be ADMIN or the creator of the expense)

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "Expense deleted successfully"
  }
}
```

**Error responses**:
- `401` — Not authenticated
- `403` — Not authorized to delete this expense
- `404` — Group or expense not found

---

## Balances — /api/groups/:groupId/balances

### GET /api/groups/:groupId/balances

**Purpose**: Calculate and return both raw pairwise balances and optimized transfer list for settling all debts.

**Auth required**: Yes (must be a member of the group)

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "rawBalances": [
      {
        "fromMemberId": "mem_001",
        "fromMemberName": "John Doe",
        "toMemberId": "mem_002",
        "toMemberName": "Amit Kumar",
        "amountPaise": 15000
      },
      {
        "fromMemberId": "mem_003",
        "fromMemberName": "Alice Smith",
        "toMemberId": "mem_001",
        "toMemberName": "John Doe",
        "amountPaise": 25000
      },
      {
        "fromMemberId": "mem_003",
        "fromMemberName": "Alice Smith",
        "toMemberId": "mem_002",
        "toMemberName": "Amit Kumar",
        "amountPaise": 10000
      }
    ],
    "optimizedTransfers": [
      {
        "fromMemberId": "mem_003",
        "fromMemberName": "Alice Smith",
        "toMemberId": "mem_001",
        "toMemberName": "John Doe",
        "amountPaise": 10000
      },
      {
        "fromMemberId": "mem_003",
        "fromMemberName": "Alice Smith",
        "toMemberId": "mem_002",
        "toMemberName": "Amit Kumar",
        "amountPaise": 25000
      }
    ],
    "summary": {
      "totalRawTransfers": 3,
      "totalOptimizedTransfers": 2,
      "savingsCount": 1
    }
  }
}
```

_The `optimizedTransfers` list uses a greedy debt minimization algorithm to reduce the number of transfers needed while preserving net balances. The sum of optimized transfers equals the sum of raw balances._

**Error responses**:
- `401` — Not authenticated
- `403` — Not a member of this group
- `404` — Group not found

---

## Settlements — /api/groups/:groupId/settlements

### POST /api/groups/:groupId/settlements

**Purpose**: Record a settlement (payment) from one member to another.

**Auth required**: Yes (must be a member of the group)

**Request body**:
```json
{
  "fromMemberId": "mem_003",
  "toMemberId": "mem_001",
  "amountPaise": 10000,
  "method": "MANUAL",
  "upiTransactionId": null,
  "note": "Cash payment for last week's expenses"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "settlement": {
      "id": "settle_abc123",
      "groupId": "grp_abc123",
      "fromMemberId": "mem_003",
      "fromMemberName": "Alice Smith",
      "toMemberId": "mem_001",
      "toMemberName": "John Doe",
      "amountPaise": 10000,
      "method": "MANUAL",
      "note": "Cash payment for last week's expenses",
      "settledAt": "2024-01-22T16:30:00Z",
      "createdAt": "2024-01-22T16:30:00Z"
    }
  }
}
```

**Error responses**:
- `400` — Invalid request (amount <= 0, invalid member IDs, fromMember same as toMember)
- `401` — Not authenticated
- `403` — Not a member of this group
- `404` — Group or member not found

---

### GET /api/groups/:groupId/settlements

**Purpose**: List all settlements for a group.

**Auth required**: Yes (must be a member of the group)

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "settlements": [
      {
        "id": "settle_abc123",
        "fromMemberId": "mem_003",
        "fromMemberName": "Alice Smith",
        "toMemberId": "mem_001",
        "toMemberName": "John Doe",
        "amountPaise": 10000,
        "method": "MANUAL",
        "note": "Cash payment for last week's expenses",
        "settledAt": "2024-01-22T16:30:00Z"
      }
    ]
  }
}
```

**Error responses**:
- `401` — Not authenticated
- `403` — Not a member of this group
- `404` — Group not found

---

## AI — /api/ai

### POST /api/ai/parse-expense

**Purpose**: Parse natural language text into structured expense data using Claude AI. This endpoint returns a pre-filled expense object for the confirm screen ONLY and MUST NOT save any data to the database. Auto-saving AI output is forbidden.

**Auth required**: Yes

**Request body**:
```json
{
  "text": "I paid Rs. 900 for dinner for me, Aman and Rohan",
  "groupId": "grp_abc123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "parsedExpense": {
      "description": "Dinner",
      "totalAmountPaise": 90000,
      "splitType": "EQUAL",
      "participants": [
        "me",
        "Aman",
        "Rohan"
      ],
      "date": "2024-01-22T19:00:00Z",
      "confidence": 0.92
    },
    "warning": "This is AI-generated data. Please review before saving."
  }
}
```

_This endpoint does NOT create an expense in the database. The frontend must display this data on a confirmation screen where the user can review and edit before explicitly saving._

**Error responses**:
- `400` — Invalid request (missing text or groupId)
- `401` — Not authenticated
- `403` — Not a member of the specified group
- `404` — Group not found
- `500` — AI service error (Anthropic API failure)

---

### POST /api/ai/scan-bill

**Purpose**: Extract structured data from a bill image using Claude AI vision. This endpoint returns a pre-filled expense object for the confirm screen ONLY and MUST NOT save any data to the database. Auto-saving AI output is forbidden.

**Auth required**: Yes

**Request body**: Multipart form data
- `image` (file) — Image file (JPEG, PNG, WebP)
- `groupId` (string) — Group ID

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "scannedBill": {
      "items": [
        {
          "description": "Butter Chicken",
          "quantity": 2,
          "unitPricePaise": 35000,
          "totalPricePaise": 70000
        },
        {
          "description": "Garlic Naan",
          "quantity": 4,
          "unitPricePaise": 5000,
          "totalPricePaise": 20000
        }
      ],
      "subtotalPaise": 90000,
      "taxPaise": 9000,
      "discountPaise": 0,
      "grandTotalPaise": 99000,
      "date": "2024-01-22T20:15:00Z",
      "vendor": "Spice Garden Restaurant",
      "confidence": 0.88
    },
    "warning": "This is AI-generated data. Please review before saving."
  }
}
```

_This endpoint does NOT create an expense in the database. The frontend must display this data on a confirmation screen where the user can review and edit before explicitly saving._

**Error responses**:
- `400` — Invalid request (missing image or groupId, invalid image format, image too large)
- `401` — Not authenticated
- `403` — Not a member of the specified group
- `404` — Group not found
- `500` — AI service error (Anthropic API failure, image processing error)

---

## Notifications — /api/notifications

### GET /api/notifications

**Purpose**: List all notifications for the authenticated user, unread first.

**Auth required**: Yes

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif_001",
        "type": "EXPENSE_ADDED",
        "title": "New expense in Goa Trip 2024",
        "body": "John Doe added an expense: Dinner at restaurant (₹900.00)",
        "isRead": false,
        "relatedGroupId": "grp_abc123",
        "relatedExpenseId": "exp_xyz123",
        "createdAt": "2024-01-20T20:01:00Z"
      },
      {
        "id": "notif_002",
        "type": "SETTLEMENT_RECEIVED",
        "title": "Payment received",
        "body": "Alice Smith paid you ₹100.00",
        "isRead": true,
        "relatedGroupId": "grp_abc123",
        "relatedExpenseId": null,
        "createdAt": "2024-01-22T16:31:00Z"
      }
    ]
  }
}
```

**Error responses**:
- `401` — Not authenticated

---

### PATCH /api/notifications/:notificationId/read

**Purpose**: Mark a single notification as read.

**Auth required**: Yes

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "Notification marked as read"
  }
}
```

**Error responses**:
- `401` — Not authenticated
- `403` — Notification does not belong to authenticated user
- `404` — Notification not found

---

### PATCH /api/notifications/read-all

**Purpose**: Mark all notifications as read for the authenticated user.

**Auth required**: Yes

**Request body**: None

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "message": "All notifications marked as read",
    "count": 5
  }
}
```

**Error responses**:
- `401` — Not authenticated

---

## Summary

This API contract defines 30+ endpoints across 8 sections:
- **Auth** (4 endpoints) — Registration, login, logout, profile
- **Groups** (6 endpoints) — CRUD operations and archival
- **Members** (3 endpoints) — Add, list, remove members (real and placeholder)
- **Expenses** (5 endpoints) — Create with 4 split types, list, view, edit, delete
- **Balances** (1 endpoint) — Raw pairwise balances + optimized transfers
- **Settlements** (2 endpoints) — Record and list payments
- **AI** (2 endpoints) — NLP parsing and bill scanning (return pre-filled data ONLY, never auto-save)
- **Notifications** (3 endpoints) — List, mark read, mark all read

All money amounts use integer paise. All responses follow a consistent `{ success, data }` or `{ success, error }` format.
