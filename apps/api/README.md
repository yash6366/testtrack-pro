# TestTrack Pro - API Server

The backend REST API server for TestTrack Pro, built with Fastify, Prisma, and PostgreSQL.

## Overview

This is a high-performance Node.js backend that handles:
- **Authentication & Authorization**: JWT-based auth with RBAC
- **Test Management**: CRUD operations for test cases, suites, and executions
- **Bug Tracking**: Complete defect lifecycle management
- **Real-time Features**: Socket.IO for live updates and notifications
- **Analytics**: Comprehensive reporting and metrics
- **File Storage**: Cloudinary integration for evidence attachments

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Fastify (High-performance web framework)
- **ORM**: Prisma (Type-safe database client)
- **Database**: PostgreSQL 15+
- **Cache**: Redis / Upstash Redis
- **Real-time**: Socket.IO
- **Authentication**: JWT + bcrypt
- **File Storage**: Cloudinary
- **Email**: Resend
- **Testing**: Jest
- **Monitoring**: Sentry

## Project Structure

```
apps/api/
├── src/
│   ├── server.js              # Main server entry point
│   ├── routes/                # API route handlers
│   │   ├── auth.js           # Authentication endpoints
│   │   ├── tests.js          # Test case management
│   │   ├── executions.js     # Test execution
│   │   ├── bugs.js           # Bug tracking
│   │   ├── analytics.js      # Reports & analytics
│   │   └── ...              
│   ├── services/             # Business logic layer
│   │   ├── authService.js    # Auth operations
│   │   ├── testCaseService.js
│   │   ├── bugService.js
│   │   └── ...
│   ├── lib/                  # Utilities & helpers
│   │   ├── prisma.js         # Prisma client
│   │   ├── jwt.js            # JWT utilities
│   │   ├── rbac.js           # Role-based access control
│   │   ├── logger.js         # Structured logging
│   │   └── ...
│   ├── plugins/              # Fastify plugins
│   │   ├── cors.js
│   │   ├── swagger.js        # API documentation
│   │   ├── rateLimit.js
│   │   └── ...
│   ├── schemas/              # Validation schemas & Swagger
│   │   ├── auth.js
│   │   ├── testCase.js
│   │   └── common.js
│   └── test-utils/           # Testing utilities
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── migrations/           # Database migrations
│   └── seed.js              # Seed data script
├── coverage/                 # Test coverage reports
├── .env                      # Environment variables
├── package.json
└── jest.config.js           # Jest configuration
```

## Environment Variables

Create a `.env` file in this directory:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/testtrack_dev"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Redis
REDIS_URL="redis://localhost:6379"
# OR for Upstash:
# UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
# UPSTASH_REDIS_REST_TOKEN="your-token"

# Email Configuration (Resend)
# Get your API key from https://resend.com/api-keys
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
# For testing, use: onboarding@resend.dev

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Server Configuration
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# Sentry (Error Monitoring)
SENTRY_DSN=""

# GitHub Integration (Optional)
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_CALLBACK_URL="http://localhost:3001/api/github/callback"

# Swagger Documentation
ENABLE_SWAGGER="true"
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 15+
- Redis 7+

### Installation

```bash
# From project root
pnpm install

# Or from this directory
cd apps/api
pnpm install
```

### Database Setup

```bash
# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Seed database (optional)
pnpm prisma db seed
```

### Running the Server

```bash
# Development mode with hot reload
pnpm dev

# Production mode
pnpm start

# Run tests
pnpm test

# Test coverage
pnpm test:coverage
```

## API Documentation

### Interactive Documentation

Once the server is running, access Swagger UI at:
- **Development**: http://localhost:3001/docs
- **Production**: https://api.yourdomain.com/docs

### API Reference

See [docs/API-REFERENCE.md](../../docs/API-REFERENCE.md) for complete endpoint documentation.

### Key Endpoints

#### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/verify-email` - Verify email
- `POST /api/auth/logout` - Logout

#### Test Management
- `GET /api/tests` - List test cases
- `POST /api/tests` - Create test case
- `GET /api/tests/:id` - Get test case
- `PUT /api/tests/:id` - Update test case
- `DELETE /api/tests/:id` - Delete test case

#### Test Execution
- `POST /api/executions` - Create test execution
- `PUT /api/executions/:id` - Update execution status
- `GET /api/executions/:id` - Get execution details

#### Bug Tracking
- `GET /api/bugs` - List bugs
- `POST /api/bugs` - Create bug
- `PUT /api/bugs/:id` - Update bug
- `PATCH /api/bugs/:id/status` - Update bug status
- `PATCH /api/bugs/:id/fix-documentation` - Document bug fix (v0.6.2)

#### Analytics
- `GET /api/analytics/overview` - Dashboard metrics
- `GET /api/analytics/test-execution-trends` - Execution trends (8-week view)
- `GET /api/analytics/bug-trends` - Bug trends and velocity
- `GET /api/analytics/flaky-tests` - Identify flaky tests (v0.6.2)
- `GET /api/analytics/execution-speed` - Performance analysis (v0.6.2)
- `GET /api/analytics/developers` - Developer productivity metrics (v0.6.2)

## Code Structure

### Services Layer

Services contain business logic and database operations:

```javascript
// Example: apps/api/src/services/testCaseService.js

/**
 * Create a new test case
 * @param {Object} data - Test case data
 * @param {number} userId - Creator user ID
 * @returns {Promise<Object>} Created test case
 */
export async function createTestCase(data, userId) {
  // Business logic here
}
```

### Routes Layer

Routes handle HTTP requests and call services:

```javascript
// Example: apps/api/src/routes/tests.js

export default async function testRoutes(fastify) {
  fastify.post('/api/tests', {
    schema: createTestCaseSchema,
    onRequest: [fastify.authenticate, fastify.requirePermission('test:create')]
  }, async (request, reply) => {
    const testCase = await createTestCase(request.body, request.user.id);
    return reply.status(201).send(testCase);
  });
}
```

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage

# Run specific test file
pnpm test testCaseService.test.js
```

Coverage reports are generated in `coverage/` directory.

## Security

### Authentication

All routes (except `/api/auth/*`) require JWT authentication:

```javascript
Authorization: Bearer <your-jwt-token>
```

### RBAC (Role-Based Access Control)

Four roles with hierarchical permissions:
- **ADMIN**: Full system access
- **DEVELOPER**: Manage bugs, view tests
- **TESTER**: Full test management
- **GUEST**: Read-only access

### Security Features

- ✅ JWT authentication with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Rate limiting (100 requests/15min)
- ✅ CSRF protection
- ✅ Helmet security headers
- ✅ Input validation & sanitization
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection

## Database Schema

Key models:
- **User**: User accounts with RBAC
- **Project**: Top-level project container
- **TestCase**: Test case definitions
- **TestExecution**: Test run instances
- **Bug**: Defect tracking
- **Notification**: User notifications

See [prisma/schema.prisma](./prisma/schema.prisma) for complete schema.

## Useful Scripts

```bash
# Database
pnpm prisma generate      # Generate Prisma client
pnpm prisma migrate dev   # Run migrations
pnpm prisma studio        # Open Prisma Studio GUI
pnpm prisma db seed       # Seed database

# Development
pnpm dev                  # Start dev server
pnpm test                 # Run tests
pnpm lint                 # Lint code

# Production
pnpm start                # Start production server
pnpm build                # Build for production (if needed)

# Utilities
node create-admin.js      # Create admin user
node test-email.js        # Test email configuration
node check-users.js       # Check user accounts
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

See [docs/ERROR-CODES.md](../../docs/ERROR-CODES.md) for detailed error codes.

## Performance

- **Response Time**: < 100ms for most endpoints
- **Throughput**: 1000+ req/sec
- **Caching**: Redis for session management and frequent queries
- **Database**: Optimized Prisma queries with proper indexes

## Monitoring

### Sentry Integration

Error tracking with Sentry:

```javascript
import * as Sentry from '@sentry/node';

Sentry.captureException(error);
```

### Logging

Structured logging with custom logger:

```javascript
import { logInfo, logError } from './lib/logger.js';

logInfo('Operation completed', { userId, action });
logError('Operation failed', error, { userId });
```

## Contributing

See [docs/CONTRIBUTING.md](../../docs/CONTRIBUTING.md) for development guidelines.

## License

MIT License - See [LICENSE](../../LICENSE) file for details.
