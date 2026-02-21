# TestTrack Pro - System Architecture

## Overview

TestTrack Pro is a comprehensive software testing management platform built with a modern, production-ready monorepo architecture. The system is organized around **projects** as the primary organizational unit, with multiple users collaborating through role-based access control (ADMIN, DEVELOPER, TESTER).

**Version**: 0.6.2  
**Status**: Production-Ready (70%+ Test Coverage)

## Tech Stack

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: React Context + Hooks
- **Real-time**: Socket.IO Client
- **Testing**: Vitest + React Testing Library
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Fastify
- **ORM**: Prisma
- **Database**: PostgreSQL 15+
- **Cache/Pub-Sub**: Redis / Upstash Redis
- **Real-time**: Socket.IO
- **Authentication**: JWT + bcrypt
- **File Storage**: Cloudinary
- **Email**: Resend
- **Job Scheduling**: node-cron
- **Testing**: Jest
- **Monitoring**: Sentry

### Infrastructure
- **Monorepo**: pnpm workspaces + Turbo
- **CI/CD**: GitHub Actions
- **Containerization**: Docker
- **Reverse Proxy**: Nginx (recommended)
- **SSL**: Let's Encrypt (recommended)

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
├─────────────────────────────────────────────────────────────┤
│  React SPA (Vite)                                            │
│  ├── Pages (Test Cases, Runs, Bugs, Analytics)              │
│  ├── Components (Modals, Forms, Charts)                     │
│  ├── Hooks (useAuth, useTestExecution, etc.)                │
│  └── Context (AuthContext, NotificationContext)             │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP/REST + WebSocket
┌──────────────────▼──────────────────────────────────────────┐
│                    API Gateway (Fastify)                     │
├─────────────────────────────────────────────────────────────┤
│  Middleware:                                                 │
│  ├── CORS                    ├── Helmet (Security)           │
│  ├── JWT Authentication      ├── Rate Limiting              │
│  ├── RBAC Authorization      ├── CSRF Protection            │
│  ├── Request Logging         └── Sentry Error Tracking      │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    Routes & Controllers                      │
├─────────────────────────────────────────────────────────────┤
│  /api/auth       /api/tests      /api/executions            │
│  /api/bugs       /api/analytics  /api/webhooks              │
│  /api/admin      /api/github     /api/notifications         │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    Service Layer                             │
├─────────────────────────────────────────────────────────────┤
│  authService     testCaseService    bugService               │
│  emailService    analyticsService   githubService            │
│  notificationService  cronService   reportService            │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│  Prisma ORM                                                  │
│  ├── Models (User, Project, TestCase, Execution, Bug)       │
│  ├── Relations                                               │
│  └── Migrations                                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│                    (Primary Data Store)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                Supporting Services                           │
├─────────────────────────────────────────────────────────────┤
│  Redis           Cloudinary      Resend API                 │
│  (Cache/PubSub)  (File Storage)  (Email Service)            │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### Core Entities

**User**
- Unique email, hashed password, role (ADMIN, TESTER, DEVELOPER)
- Account security: verification tokens, failed login tracking, lockout mechanism
- Refresh token rotation for session management
- Audit logging via UserActivityLog and AuditLog

**Project**
- Owner (User), status (ACTIVE, ARCHIVED)
- User allocations with project-specific roles
- Isolated test cases, runs, bugs, and artifacts per project
- SearchIndex for full-text search across resources

**TestCase**
- Name, description, type (FUNCTIONAL, REGRESSION, SMOKE, etc.)
- Priority (P0-P4), severity (CRITICAL, MAJOR, MINOR, TRIVIAL)
- Status (DRAFT, ACTIVE, DEPRECATED, ARCHIVED)
- Steps with sequential ordering
- Version history (TestCaseVersion) for change tracking
- Soft-delete support (isDeleted flag)

**TestRun**
- Name, environment, build version
- Status: NOT_STARTED, IN_PROGRESS, COMPLETED, PAUSED
- Multiple TestExecutions (1:N relationship)
- Timestamps: planned, actual start/end dates

**TestExecution**
- Links TestCase + TestRun
- Status: BLOCKED, PASSED, FAILED, SKIPPED
- ExecutionStep records per test step
- Evidence attachments for screenshots/logs
- Duration tracking in seconds

**Bug (Defect)**
- Unique bugNumber (e.g., "PROJ-001")
- Status workflow: NEW → ASSIGNED → IN_PROGRESS → FIXED → VERIFIED_FIXED → CLOSED
- Severity (CRITICAL, MAJOR, MINOR, TRIVIAL), Priority (P0-P4)
- Environment, affected version, reproducibility
- **New in v0.6.2**: Fix documentation fields:
  - `fixStrategy`: How the bug was fixed
  - `rootCauseAnalysis`: Analysis of root cause
  - `rootCauseCategory`: DESIGN_DEFECT, IMPLEMENTATION_ERROR, etc.
  - `fixedInCommitHash`, `fixBranchName`: Git traceability
  - `codeReviewUrl`: Link to PR for fix
  - `targetFixVersion`, `fixedInVersion`: Version tracking
  - `actualFixHours`: Time spent on fix

**TestSuite**
- Logical grouping of test cases
- Types: REGRESSION, SMOKE, SANITY, CUSTOM
- Status: ACTIVE, ARCHIVED, DEPRECATED
- Execution tracking and result aggregation

**TestPlan**
- Collection of test cases for a release
- Status tracking: PLANNED, IN_PROGRESS, COMPLETED
- Milestone associations

**Notification**
- Real-time and email delivery
- DeliveryStatus tracking (PENDING, DELIVERED, FAILED, BOUNCED)
- Expiration (30-day retention)
- User preferences for notification types

**SearchIndex**
- Full-text search across test cases, bugs, executions
- Indexed fields: title, content, tags
- Automatic indexing on create/update
- Optimized for substring matching

## Key Features & Components

### 1. Role-Based Access Control (RBAC)

```javascript
// Authentication Flow
1. User logs in → JWT token issued
2. Token stored in localStorage (frontend)
3. Each request includes Authorization header
4. Server validates JWT and extracts user
5. RBAC middleware checks permissions
```

### 2. Real-Time Communication

**Socket.IO Architecture**:
- Server: `apps/api/src/lib/socket.js`
- Client: `apps/web/src/lib/socket.js`
- Events: notifications, chat messages, executions
- Rooms: per-user, per-project channels

### 3. Test Execution Engine

**Flow**:
1. Tester creates TestRun
2. Selects test cases to execute
3. Navigates through each step
4. Records PASS/FAIL/BLOCKED per step
5. Overall execution status calculated
6. Failures can create Bugs

###Service Layer Architecture

### Key Services

**Authentication & Authorization**
- `authService.js`: User signup, login, token refresh, password reset
- `rbac.js`: JWT verification, role-based middleware
- `permissions.js`: Permission matrix (ADMIN, DEVELOPER, TESTER)
- `testCasePermissions.js`: Resource-level permission checks

**Business Logic Services**
- `testCaseService.js`: CRUD, versioning, soft-delete, templates
- `bugService.js`: Bug lifecycle, fix documentation, unique ID generation (serializable)
- `analyticsService.js`: Trend analysis, flaky test detection, execution speed metrics
- `searchService.js` & `searchIndexService.js`: Full-text search with index maintenance
- `notificationService.js`: Creation, delivery, preferences, digest scheduling
- `notificationEmitter.js`: Real-time WebSocket emission, delivery tracking

**Developer Features**
- `developerService.js`: Developer analytics, fix documentation, bug assignment tracking

**Infrastructure Services**
- `emailService.js`: Email templates, verification, password reset
- `channelService.js`: Chat channels, universal channel management
- `githubService.js`: GitHub OAuth, commit linking
- `commitParserService.js`: Auto-linking commits to bugs via regex patterns
- `auditService.js`: Comprehensive audit logging for compliance

## Database Schema (v0.6.2)

### Core Models

**User**
- Authentication credentials (email, password hash)
- Profile (name, avatar, timezone)
- Roles (ADMIN, DEVELOPER, TESTER)
- OAuth integrations (Google, GitHub)
- Preferences (notifications, theme)

**Project**
- Team workspace for test management
- Multiple channels for team collaboration
- Configurable members with role assignment
- Activity tracking and audit logs

**TestCase**
- Test specifications with steps and expected results
- Versioning and change history
- Status workflow (Draft → Review → Approved → Deprecated)
- Tags and categorization
- Evidence attachments (screenshots, logs)

**TestExecution**
- Recorded test runs with step-level results
- Pass/Fail/Blocked status per step
- Execution time tracking (pass rate, avg duration)
- Flaky test detection (inconsistent results)
- Links to bug reports from failures

**Bug**
- Defect tracking with complete lifecycle
- Severity and priority classification
- Assignment to developers
- Status workflow (Open → In Progress → Resolved → Verified)
- Attachment storage (evidence files)

**BugFixDocumentation** *(NEW in v0.6.2)*
- Root cause classification (Design Defect, Implementation Error, Configuration Issue, etc.)
- Detailed fix description
- Git commit/PR linking
- Fix hours tracking
- Developer attribution
- Verification status

**DeveloperAnalytics** *(NEW in v0.6.2)*
- Bugs fixed per developer
- Average fix time calculations
- Root cause distribution analysis
- Productivity metrics and trends
- Performance insights

**ExecutionMetrics**
- Flaky test detection data
- Pass/fail trend tracking (8-week history)
- Performance analytics (execution speed)
- Test coverage metrics
- Bug velocity tracking

## Deployment Architecture

### Recommended Production Setup

```
Internet
  │
  ▼
┌─────────────┐
│   Nginx     │ (Reverse Proxy, SSL Termination)
└──────┬──────┘
       │
   ┌───┴───────────┐
   │               │
┌──▼──┐         ┌─▼──┐
│ Web │         │ API│ (Node.js Processes)
│(SPA)│         │    │ (PM2 Cluster Mode)
│:5173│         │:3001│ (Multiple instances)
└──┬──┘         └─┬──┘
   │               │
   └───────┬───────┘
           │
   ┌───────┴────────┐
   │                │
┌──▼──────┐    ┌───▼──────┐
│PostgreSQL│   │  Redis    │
│ Primary  │   │  Cache    │
│ DB       │   │  & PubSub │
└──────────┘   └assword reset flow

### Authorization
- RBAC at route level
- Resource-level permissions
- Admin-only endpoints protected

### Data Protection
- Helmet.js security headers
- CSRF protection
- Rate limiting
- Input sanitization
- SQL injection prevention (Prisma)

### Monitoring
- Sentry error tracking
- Structured JSON logging
- Audit trails for sensitive operations

## Deployment Architecture

### Recommended Production Setup

```
Internet
  │
  ▼
┌─────────────┐
│   Nginx     │ (Reverse Proxy, SSL Termination)
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐  ┌─▼──┐
│ Web │  │ API│ (Node.js Processes)
│(SPA)│  │    │ (PM2 Cluster Mode)
└──┬──┘  └─┬──┘
   │       │
   └───┬───┘
       │
┌──────▼──────┐
│ PostgreSQL  │
│   + Redis   │
└─────────────┘
```

### Container Deployment

```dockerfile
# Example docker-compose.yml structure
services:
  web:
    build: ./apps/web
    ports:
      - "3000:3000"
    depends_on:
      - api
  
  api:
    build: ./apps/api
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
```

## Scalability Considerations

### Horizontal Scaling
- Stateless API servers (JWT auth)
- Redis for session/cache sharing
- Socket.IO with Redis adapter
- Database read replicas

### Performance Optimizations
- Response caching (Redis)
- Database query optimization
- Connection pooling
- CDN for static assets
- Lazy loading + code splitting

### Monitoring & Observability
- Health check endpoints
- Sentry for error tracking
- Structured logging (JSON)
- Performance metrics

## File Structure

```
testtrack-pro/
├── apps/
│   ├── api/              # Backend (Fastify + Prisma)
│   │   ├── prisma/       # Database schema & migrations
│   │   └── src/
│   │       ├── routes/   # API endpoints
│   │       ├── services/ # Business logic
│   │       ├── lib/      # Utilities (auth, logger, RBAC)
│   │       └── plugins/  # Fastify plugins
│   │
│   └── web/              # Frontend (React + Vite)
│       └── src/
│           ├── pages/    # Route components
│           ├── components/ # Reusable UI
│           ├── hooks/    # Custom React hooks
│           └── lib/      # Utilities (API client, socket)
│
├── docs/                 # Documentation
├── scripts/              # Utility scripts (backup, deploy)
└── packages/             # Shared packages
    └── shared/           # Shared types/utilities
```

## Technology Decisions

### Why Fastify?
- High performance (faster than Express)
- Built-in schema validation
- Plugin architecture
- Modern async/await support

### Why Prisma?
- Type-safe database access
- Auto-generated TypeScript types
- Migration management
- Excellent developer experience

### Why Monorepo?
- Code sharing between apps
- Atomic commits across frontend/backend
- Simplified dependency management
- Better developer experience

## Future Enhancements

- GraphQL API option
- Multi-tenancy support
- Advanced CI/CD integration
- Mobile app (React Native)
- AI-powered test suggestions
- Video recording of test executions
- Integration marketplace
