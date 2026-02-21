# TestTrack Pro - API Reference

Complete REST API documentation. For interactive API exploration, visit `/documentation` after starting the server.

## Authentication

### JWT Authentication

All endpoints except `/api/auth/*` require Bearer token:

```bash
Authorization: Bearer <your-jwt-token>
```

### Obtain Token

**POST** `/api/auth/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "TESTER"
  }
}
```

### Refresh Token

**POST** `/api/auth/refresh`

Request:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Users

### List Users

**GET** `/api/admin/users`

Query Parameters:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `role` (string): Filter by role (ADMIN, TESTER, DEVELOPER)
- `search` (string): Search by email or name

Response:
```json
{
  "data": [
    {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "role": "TESTER",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 15
}
```

### Get User

**GET** `/api/admin/users/:userId`

Response:
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "TESTER",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Create User

**POST** `/api/admin/users`

Request:
```json
{
  "email": "newuser@example.com",
  "name": "Jane Smith",
  "password": "SecurePassword123!",
  "role": "TESTER"
}
```

Response: `201 Created`

### Update User

**PATCH** `/api/admin/users/:userId`

Request:
```json
{
  "name": "Jane Smith Updated",
  "role": "DEVELOPER"
}
```

Response: `200 OK`

### Delete User

**DELETE** `/api/admin/users/:userId`

Response: `204 No Content`

## Projects

### List Projects

**GET** `/api/projects`

Query Parameters:
- `page` (number): Pagination
- `search` (string): Search by name

Response:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Web App v2.0",
      "description": "Testing web application",
      "createdAt": "2024-01-10T08:00:00Z"
    }
  ]
}
```

### Get Project

**GET** `/api/projects/:projectId`

Response:
```json
{
  "id": 1,
  "name": "Web App v2.0",
  "description": "Testing web application",
  "createdAt": "2024-01-10T08:00:00Z",
  "members": [
    {
      "userId": 1,
      "email": "user@example.com",
      "role": "LEAD"
    }
  ]
}
```

### Create Project

**POST** `/api/projects`

Request:
```json
{
  "name": "Mobile App v1.0",
  "description": "Testing mobile application"
}
```

Response: `201 Created`

### Update Project

**PATCH** `/api/projects/:projectId`

Request:
```json
{
  "name": "Mobile App v1.1",
  "description": "Updated description"
}
```

Response: `200 OK`

### Add Project Member

**POST** `/api/projects/:projectId/members`

Request:
```json
{
  "userId": 2,
  "role": "TESTER"
}
```

Response: `200 OK`

## Test Cases

### List Test Cases

**GET** `/api/projects/:projectId/tests`

Query Parameters:
- `page` (number): Pagination
- `status` (string): DRAFT, READY, DEPRECATED
- `priority` (string): LOW, MEDIUM, HIGH, CRITICAL
- `search` (string): Search by title

Response:
```json
{
  "data": [
    {
      "id": 1,
      "title": "User Login Flow",
      "description": "Verify user can login with valid credentials",
      "type": "FUNCTIONAL",
      "priority": "HIGH",
      "status": "READY",
      "steps": 5,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Get Test Case

**GET** `/api/projects/:projectId/tests/:testId`

Response:
```json
{
  "id": 1,
  "title": "User Login Flow",
  "description": "Verify user can login with valid credentials",
  "type": "FUNCTIONAL",
  "priority": "HIGH",
  "status": "READY",
  "steps": [
    {
      "id": 1,
      "title": "Open login page",
      "expectedResult": "Login form is displayed"
    },
    {
      "id": 2,
      "title": "Enter valid credentials",
      "expectedResult": "User is logged in"
    }
  ]
}
```

### Create Test Case

**POST** `/api/projects/:projectId/tests`

Request:
```json
{
  "title": "User Registration",
  "description": "Test user registration flow",
  "type": "FUNCTIONAL",
  "priority": "HIGH",
  "steps": [
    {
      "title": "Navigate to signup page",
      "expectedResult": "Signup form is displayed"
    },
    {
      "title": "Fill in registration details",
      "expectedResult": "All fields accept input"
    }
  ]
}
```

Response: `201 Created`

### Update Test Case

**PATCH** `/api/projects/:projectId/tests/:testId`

Request:
```json
{
  "title": "User Registration v2",
  "status": "READY"
}
```

Response: `200 OK`

### Delete Test Case

**DELETE** `/api/projects/:projectId/tests/:testId`

Response: `204 No Content`

## Test Execution

### Create Test Run

**POST** `/api/projects/:projectId/test-runs`

Request:
```json
{
  "name": "Sprint 5 Testing",
  "environment": "STAGING",
  "buildVersion": "1.2.0",
  "testIds": [1, 2, 3]
}
```

Response: `201 Created`

### List Test Runs

**GET** `/api/projects/:projectId/test-runs`

Response:
```json
{
  "data": [
    {
      "id": 1,
      "name": "Sprint 5 Testing",
      "environment": "STAGING",
      "status": "IN_PROGRESS",
      "passCount": 15,
      "failCount": 2,
      "totalTests": 20,
      "passRate": 75,
      "startedAt": "2024-02-01T09:00:00Z"
    }
  ]
}
```

### Get Test Run

**GET** `/api/projects/:projectId/test-runs/:runId`

Response:
```json
{
  "id": 1,
  "name": "Sprint 5 Testing",
  "environment": "STAGING",
  "buildVersion": "1.2.0",
  "status": "COMPLETED",
  "startedAt": "2024-02-01T09:00:00Z",
  "completedAt": "2024-02-01T17:30:00Z",
  "executions": [
    {
      "id": 1,
      "testId": 1,
      "testTitle": "User Login",
      "status": "PASS",
      "timeSpent": 300,
      "comment": "Passed all steps"
    }
  ]
}
```

### Execute Test Case

**POST** `/api/test-runs/:runId/executions/:executionId/steps/:stepId`

Request:
```json
{
  "status": "PASS",
  "actualResult": "Login successful",
  "comment": "Worked as expected"
}
```

Response: `200 OK`

### Complete Test Execution

**PATCH** `/api/test-runs/:runId/executions/:executionId`

Request:
```json
{
  "status": "PASS",
  "comment": "All steps passed"
}
```

Response: `200 OK`

## Bugs/Defects

### List Bugs

**GET** `/api/projects/:projectId/bugs`

Query Parameters:
- `status` (string): NEW, ASSIGNED, IN_PROGRESS, FIXED, CLOSED
- `priority` (string): LOW, MEDIUM, HIGH, CRITICAL
- `severity` (string): MINOR, MAJOR, CRITICAL
- `assignee` (number): User ID
- `search` (string): Search in title/description

Response:
```json
{
  "data": [
    {
      "id": 1,
      "title": "Login button not clickable",
      "description": "On mobile, login button is not responsive",
      "status": "ASSIGNED",
      "priority": "HIGH",
      "severity": "MAJOR",
      "reportedBy": {
        "id": 5,
        "name": "John Doe"
      },
      "assignedTo": {
        "id": 3,
        "name": "Dev Team"
      },
      "createdAt": "2024-02-10T14:20:00Z"
    }
  ]
}
```

### Get Bug

**GET** `/api/projects/:projectId/bugs/:bugId`

Response:
```json
{
  "id": 1,
  "title": "Login button not clickable",
  "description": "On mobile, login button is not responsive",
  "status": "ASSIGNED",
  "priority": "HIGH",
  "severity": "MAJOR",
  "environment": "STAGING",
  "reportedBy": {
    "id": 5,
    "name": "John Doe"
  },
  "assignedTo": {
    "id": 3,
    "name": "Dev Team"
  },
  "linkedTests": [1, 2],
  "attachments": ["screenshot.png"],
  "comments": [
    {
      "id": 1,
      "author": "dev@example.com",
      "text": "Fixed in v1.2.1",
      "createdAt": "2024-02-11T10:00:00Z"
    }
  ]
}
```

### Create Bug

**POST** `/api/projects/:projectId/bugs`

Request:
```json
{
  "title": "Login button not clickable",
  "description": "On mobile, login button is not responsive",
  "priority": "HIGH",
  "severity": "MAJOR",
  "environment": "STAGING",
  "linkedTestIds": [1, 2],
  "attachments": ["screenshot.png"]
}
```

Response: `201 Created`

### Update Bug

**PATCH** `/api/projects/:projectId/bugs/:bugId`

Request:
```json
{
  "status": "FIXED",
  "priority": "MEDIUM",
  "assignedTo": 3
}
```

Response: `200 OK`

### Add Bug Comment

**POST** `/api/projects/:projectId/bugs/:bugId/comments`

Request:
```json
{
  "text": "Fixed in PR #234"
}
```

Response: `201 Created`

### Verify Bug Fix

**POST** `/api/projects/:projectId/bugs/:bugId/verify`

Request:
```json
{
  "verified": true,
  "comment": "Verified in staging environment"
}
```

Response: `200 OK`

### Document Bug Fix (NEW in v0.6.2)

**PATCH** `/api/projects/:projectId/bugs/:bugId/fix-documentation`

Request:
```json
{
  "fixStrategy": "Refactored login validation logic to handle special characters properly. Updated regex pattern to be more permissive.",
  "rootCauseAnalysis": "The password validation regex was too restrictive and incorrectly rejected valid special characters supported by backend.",
  "rootCauseCategory": "IMPLEMENTATION_ERROR",
  "fixedInCommitHash": "a3f7c89d4e2b1f6a9c8e3d2f1a0b9c8d7e6f5a4",
  "fixBranchName": "fix/login-validation-chars",
  "codeReviewUrl": "https://github.com/org/repo/pull/1234",
  "targetFixVersion": "0.6.3",
  "fixedInVersion": "0.6.3",
  "actualFixHours": 4.5
}
```

Response: `200 OK`

**Response:**
```json
{
  "id": 1,
  "title": "Login button not clickable",
  "status": "FIXED",
  "fixStrategy": "Refactored login validation logic...",
  "rootCauseAnalysis": "The password validation regex...",
  "rootCauseCategory": "IMPLEMENTATION_ERROR",
  "fixedInCommitHash": "a3f7c89d4e2b1f6a9c8e3d2f1a0b9c8d7e6f5a4",
  "fixBranchName": "fix/login-validation-chars",
  "codeReviewUrl": "https://github.com/org/repo/pull/1234",
  "targetFixVersion": "0.6.3",
  "fixedInVersion": "0.6.3",
  "actualFixHours": 4.5,
  "updatedAt": "2024-02-12T15:30:00Z"
}
```

**Root Cause Categories:**
- `DESIGN_DEFECT`: Flaw in system design
- `IMPLEMENTATION_ERROR`: Coding error
- `ENVIRONMENTAL_ISSUE`: Environment-related
- `THIRD_PARTY_LIBRARY`: Third-party library issue
- `DOCUMENTATION_ERROR`: Documentation mistake led to bug
- `CONFIGURATION_ISSUE`: Configuration problem
- `OTHER`: Other cause

## Analytics & Reports

### Get Execution Trends

**GET** `/api/projects/:projectId/analytics/execution-trends`

Query Parameters:
- `weeks` (number): Number of weeks (default: 8)

Response:
```json
{
  "projectId": 1,
  "timeframe": "8 weeks",
  "data": [
    {
      "week": "2024-01-01",
      "total": 45,
      "passed": 40,
      "failed": 3,
      "blocked": 2,
      "passRate": 88.9
    }
  ],
  "summary": {
    "avgPassRate": 85.5,
    "trend": "improving"
  }
}
```

### Get Flaky Tests

**GET** `/api/projects/:projectId/analytics/flaky-tests`

Query Parameters:
- `runsThreshold` (number): Minimum runs to consider (default: 5)

Response:
```json
{
  "projectId": 1,
  "data": [
    {
      "testCaseId": 15,
      "testCaseName": "User Login with Special Characters",
      "flakeRate": 45.0,
      "recentRuns": 10,
      "passedRuns": 6,
      "failedRuns": 4
    },
    {
      "testCaseId": 22,
      "testCaseName": "Database Connection Retry",
      "flakeRate": 30.0,
      "recentRuns": 10,
      "passedRuns": 7,
      "failedRuns": 3
    }
  ]
}
```

### Get Execution Speed Analysis

**GET** `/api/projects/:projectId/analytics/execution-speed`

Query Parameters:
- `days` (number): Days to analyze (default: 30)

Response:
```json
{
  "projectId": 1,
  "days": 30,
  "total": {
    "count": 500,
    "p50": 120,
    "p95": 480,
    "p99": 720,
    "avg": 185,
    "min": 30,
    "max": 900
  },
  "byStatus": {
    "passed": {
      "count": 450,
      "avg": 170,
      "p95": 450
    },
    "failed": {
      "count": 50,
      "avg": 280,
      "p95": 600
    }
  }
}
```

### Get Bug Trend Analysis

**GET** `/api/projects/:projectId/analytics/bug-trends`

Query Parameters:
- `weeks` (number): Number of weeks (default: 8)

Response:
```json
{
  "projectId": 1,
  "weeks": 8,
  "data": [
    {
      "week": "2024-01-01",
      "created": 12,
      "resolved": 8,
      "reopened": 1,
      "velocity": 4
    }
  ],
  "currentVelocity": 3
}
```

### Get Test Analytics

**GET** `/api/projects/:projectId/analytics/tests`

Response:
```json
{
  "totalTests": 150,
  "passedTests": 120,
  "failedTests": 20,
  "blockedTests": 10,
  "passRate": 80,
  "executionTrend": [
    {
      "date": "2024-02-01",
      "passed": 15,
      "failed": 2,
      "blocked": 1
    }
  ]
}
```

### Get Bug Analytics

**GET** `/api/projects/:projectId/analytics/bugs`

Response:
```json
{
  "totalBugs": 50,
  "openBugs": 15,
  "closedBugs": 35,
  "byPriority": {
    "LOW": 5,
    "MEDIUM": 20,
    "HIGH": 15,
    "CRITICAL": 10
  },
  "bySeverity": {
    "MINOR": 10,
    "MAJOR": 25,
    "CRITICAL": 15
  },
  "avgTimeToClose": 86400
}
```

### Get Developer Analytics (NEW in v0.6.2)

**GET** `/api/projects/:projectId/analytics/developers`

Query Parameters:
- `weeks` (number): Number of weeks to analyze (default: 8)

Response:
```json
{
  "projectId": 1,
  "weeks": 8,
  "developers": [
    {
      "developerId": 3,
      "developerName": "Alice Smith",
      "bugCount": 18,
      "avgFixTimeHours": 4.5,
      "rootCauseDistribution": {
        "DESIGN_DEFECT": 2,
        "IMPLEMENTATION_ERROR": 10
      },
      "trend": "improving"
    }
  ]
}
```

### Export Report

**GET** `/api/projects/:projectId/reports/export?format=pdf&startDate=2024-02-01&endDate=2024-02-28`

Query Parameters:
- `format` (string): pdf, excel, json
- `startDate` (string): ISO date
- `endDate` (string): ISO date

Response: File download

## Webhooks

### Create Webhook

**POST** `/api/projects/:projectId/webhooks`

Request:
```json
{
  "url": "https://your-domain.com/webhooks/testtrack",
  "events": ["test.completed", "bug.created", "execution.finished"],
  "active": true
}
```

Response: `201 Created`

### List Webhooks

**GET** `/api/projects/:projectId/webhooks`

### Delete Webhook

**DELETE** `/api/projects/:projectId/webhooks/:webhookId`

Response: `204 No Content`

### Webhook Events

Webhook payload structure:

```json
{
  "id": "webhook-event-123",
  "event": "test.completed",
  "timestamp": "2024-02-12T10:30:00Z",
  "project": {
    "id": 1,
    "name": "Web App v2.0"
  },
  "data": {
    "testId": 5,
    "status": "PASS",
    "timeSpent": 120
  }
}
```

## Health Checks

### Basic Health

**GET** `/health`

Response:
```json
{
  "status": "ok"
}
```

### Detailed Health

**GET** `/api/health/status`

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-02-12T10:30:00Z",
  "uptime": 86400,
  "database": {
    "status": "connected",
    "responseTime": 5
  },
  "redis": {
    "status": "connected",
    "responseTime": 2
  }
}
```

### Readiness

**GET** `/api/health/ready`

Response: `204 No Content` (ready) or `503 Service Unavailable` (not ready)

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation error",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (resource exists)
- `500` - Internal Server Error

## Rate Limiting

Rate limits are enforced per user per minute:

- Public endpoints: 60 requests/minute
- Authenticated endpoints: 180 requests/minute
- Admin endpoints: 300 requests/minute

Response headers:
```
X-RateLimit-Limit: 180
X-RateLimit-Remaining: 175
X-RateLimit-Reset: 1707735360
```

## Pagination

List endpoints use cursor-based pagination:

Query Parameters:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)

Response:
```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 250,
    "pages": 25
  }
}
```

## WebSocket Events

Connect to `/socket.io`:

```javascript
const socket = io('http://localhost:3001');

// Listen for notifications
socket.on('notification:new', (data) => {
  console.log('New notification:', data);
});

// Listen for test execution updates
socket.on('execution:update', (data) => {
  console.log('Execution updated:', data);
});

// Listen for real-time chat messages
socket.on('chat:message', (data) => {
  console.log('New message:', data);
});
```

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3001/api'
});

// Login
const { data } = await client.post('/auth/login', {
  email: 'user@example.com',
  password: 'password'
});

client.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;

// Get projects
const projects = await client.get('/projects');
console.log(projects.data);
```

### Python

```python
import requests

BASE_URL = 'http://localhost:3001/api'

# Login
response = requests.post(f'{BASE_URL}/auth/login', json={
    'email': 'user@example.com',
    'password': 'password'
})

token = response.json()['accessToken']
headers = {'Authorization': f'Bearer {token}'}

# Get projects
projects = requests.get(f'{BASE_URL}/projects', headers=headers)
print(projects.json())
```

### cURL

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get projects (with token)
curl -X GET http://localhost:3001/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```
