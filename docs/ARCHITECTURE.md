# TestTrack Pro - System Architecture

## Overview

TestTrack Pro is a modern, full-stack test management platform built with a microservices-inspired architecture using a monorepo structure.

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
- **Email**: Nodemailer
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
│  Redis           Cloudinary      Email Server               │
│  (Cache/PubSub)  (File Storage)  (SMTP)                     │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### Core Entities

**User**
- id, email, password (hashed), name, role
- Roles: ADMIN, TESTER, DEVELOPER

**Project**
- id, name, description, settings
- Many Users (via ProjectMember)

**TestCase**
- id, title, description, type, priority, status
- Steps (TestStep[])
- Belongs to Project

**TestRun**
- id, name, environment, buildVersion
- Contains multiple TestExecutions

**TestExecution**
- id, status, actualResult
- Links TestCase + TestRun
- Many ExecutionSteps

**Defect (Bug)**
- id, title, description, status, priority, severity
- Reporter, Assignee
- Linked to TestExecution

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

### 4. Bug Tracking Workflow

**Statuses**:
```
NEW → ASSIGNED → IN_PROGRESS → FIXED
    → AWAITING_VERIFICATION → VERIFIED_FIXED → CLOSED
    → REOPENED (if verification fails)
```

### 5. Analytics & Reporting

- Test pass/fail rates
- Bug trends
- Coverage metrics
- Execution history
- Exportable reports (PDF, Excel)

## Security Architecture

### Authentication
- JWT tokens (1h expiry)
- Refresh token rotation
- Secure password hashing (bcrypt, 12 rounds)
- Email verification
- Password reset flow

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
