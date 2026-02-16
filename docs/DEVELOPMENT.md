# Development Guide

This guide covers setting up your local development environment and common development workflows.

## Prerequisites

### Required Software
- **Node.js**: v20 or higher ([Download](https://nodejs.org/))
- **pnpm**: v8+ (install via `npm install -g pnpm`)
- **PostgreSQL**: v15+ ([Download](https://www.postgresql.org/download/))
- **Redis**: v7+ ([Download](https://redis.io/download/))
- **Git**: Latest version

### Optional Tools
- **Docker**: For containerized development
- **PostgreSQL GUI**: pgAdmin, TablePlus, or DBeaver
- **Redis GUI**: RedisInsight
- **API Testing**: Postman, Insomnia, or Bruno

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/testtrack-pro.git
cd testtrack-pro
```

### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

This will install dependencies for:
- Root workspace
- Backend (`apps/api`)
- Frontend (`apps/web`)
- Shared packages

### 3. Database Setup

#### Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE testtrack_dev;

# Create user (optional)
CREATE USER testtrack WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE testtrack_dev TO testtrack;

# Exit
\q
```

#### Configure Environment Variables

Create `apps/api/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/testtrack_dev"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Redis
REDIS_URL="redis://localhost:6379"
# OR for Upstash:
# UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
# UPSTASH_REDIS_REST_TOKEN="your-token"

# Email (for testing, use Ethereal)
SMTP_HOST="smtp.ethereal.email"
SMTP_PORT=587
SMTP_USER="your-user@ethereal.email"
SMTP_PASS="your-password"
EMAIL_FROM="TestTrack Pro <noreply@testtrack.com>"

# Cloudinary (optional for local dev)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Server
PORT=3001
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# Sentry (optional)
SENTRY_DSN=""

# GitHub Integration (optional)
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GITHUB_WEBHOOK_SECRET=""
```

Create `apps/web/.env`:

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
VITE_SENTRY_DSN=""
```

#### Run Migrations

```bash
cd apps/api
pnpm prisma migrate dev
```

#### Seed Database (Optional)

```bash
pnpm prisma db seed
```

This creates:
- Admin user: `admin@testtrack.com` / `Admin@123`
- Sample projects
- Sample test cases

### 4. Start Development Servers

#### Option A: Start All Services

```bash
# From root directory
pnpm dev
```

This starts:
- Backend API on `http://localhost:3001`
- Frontend on `http://localhost:5173`

#### Option B: Start Services Individually

```bash
# Terminal 1: Backend
cd apps/api
pnpm dev

# Terminal 2: Frontend
cd apps/web
pnpm dev

# Terminal 3: Redis (if not running as service)
redis-server
```

### 5. Verify Setup

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/documentation
- Health Check: http://localhost:3001/health

## Development Workflows

### Working with the Database

#### Create a Migration

```bash
cd apps/api

# Create migration after schema changes
pnpm prisma migrate dev --name add_new_feature

# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset

# View database in Prisma Studio
pnpm prisma studio
```

#### Common Prisma Commands

```bash
# Generate Prisma Client after schema changes
pnpm prisma generate

# Format schema file
pnpm prisma format

# Validate schema
pnpm prisma validate

# Pull schema from database
pnpm prisma db pull

# Push schema to database (without migration)
pnpm prisma db push
```

### Creating a New Feature

#### 1. Create a Branch

```bash
git checkout -b feature/add-custom-fields
```

#### 2. Backend Development

**Create a Service** (`apps/api/src/services/customFieldService.js`):

```javascript
import prisma from '../lib/prisma.js';

export class CustomFieldService {
  async createCustomField(projectId, data) {
    return await prisma.customField.create({
      data: {
        ...data,
        projectId,
      },
    });
  }

  async getCustomFields(projectId) {
    return await prisma.customField.findMany({
      where: { projectId },
    });
  }
}
```

**Create a Route** (`apps/api/src/routes/customFields.js`):

```javascript
import { CustomFieldService } from '../services/customFieldService.js';

export default async function customFieldsRoutes(fastify) {
  const service = new CustomFieldService();

  fastify.post('/custom-fields', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'type', 'projectId'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['text', 'number', 'date'] },
          projectId: { type: 'integer' },
        },
      },
    },
    handler: async (request, reply) => {
      const field = await service.createCustomField(
        request.body.projectId,
        request.body
      );
      reply.code(201).send(field);
    },
  });
}
```

**Register Route** (`apps/api/src/server.js`):

```javascript
import customFieldsRoutes from './routes/customFields.js';

// ...
await server.register(customFieldsRoutes, { prefix: '/api' });
```

#### 3. Frontend Development

**Create API Hook** (`apps/web/src/hooks/useCustomFields.js`):

```javascript
import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';

export function useCustomFields(projectId) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFields() {
      try {
        const data = await apiClient.get(`/custom-fields?projectId=${projectId}`);
        setFields(data);
      } catch (error) {
        console.error('Failed to fetch custom fields:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchFields();
  }, [projectId]);

  return { fields, loading };
}
```

**Create Component** (`apps/web/src/components/CustomFieldForm.jsx`):

```jsx
import { useState } from 'react';
import { apiClient } from '../lib/apiClient';

export function CustomFieldForm({ projectId, onSuccess }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('text');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await apiClient.post('/custom-fields', { name, type, projectId });
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Field name"
        required
      />
      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="text">Text</option>
        <option value="number">Number</option>
        <option value="date">Date</option>
      </select>
      <button type="submit">Create Field</button>
    </form>
  );
}
```

### Testing

#### Run Tests

```bash
# Run all tests
pnpm test

# Run backend tests
cd apps/api
pnpm test

# Run frontend tests
cd apps/web
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

#### Write a Backend Test

```javascript
// apps/api/src/services/tests/customFieldService.test.js
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CustomFieldService } from '../customFieldService.js';

jest.mock('../../lib/prisma.js', () => ({
  __esModule: true,
  default: {
    customField: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('CustomFieldService', () => {
  let service;

  beforeEach(() => {
    service = new CustomFieldService();
    jest.clearAllMocks();
  });

  it('should create custom field', async () => {
    const mockField = { id: 1, name: 'Priority', type: 'text' };
    prisma.customField.create.mockResolvedValue(mockField);

    const result = await service.createCustomField(1, {
      name: 'Priority',
      type: 'text',
    });

    expect(result).toEqual(mockField);
  });
});
```

#### Write a Frontend Test

```jsx
// apps/web/src/components/tests/CustomFieldForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CustomFieldForm } from '../CustomFieldForm';
import * as apiClient from '../../lib/apiClient';

vi.mock('../../lib/apiClient');

describe('CustomFieldForm', () => {
  it('should submit form', async () => {
    const onSuccess = vi.fn();
    apiClient.post = vi.fn().mockResolvedValue({});

    render(<CustomFieldForm projectId={1} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByPlaceholderText('Field name'), {
      target: { value: 'Priority' },
    });
    fireEvent.click(screen.getByText('Create Field'));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/custom-fields', {
        name: 'Priority',
        type: 'text',
        projectId: 1,
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
```

### Debugging

#### Backend Debugging (VS Code)

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/apps/api/src/server.js",
      "cwd": "${workspaceFolder}/apps/api",
      "envFile": "${workspaceFolder}/apps/api/.env",
      "console": "integratedTerminal"
    }
  ]
}
```

#### Frontend Debugging

Use React DevTools extension and browser DevTools.

#### Database Debugging

```bash
# View query logs
cd apps/api
pnpm prisma studio

# Or use psql
psql -U postgres -d testtrack_dev

# View all tables
\dt

# Describe table
\d users

# Query data
SELECT * FROM users;
```

### Code Quality

#### Linting

```bash
# Lint all code
pnpm lint

# Lint and fix
pnpm lint:fix

# Lint specific workspace
cd apps/api
pnpm lint
```

#### Formatting

```bash
# Format with Prettier (if configured)
pnpm format
```

### Common Issues & Solutions

#### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

#### Database Connection Issues

```bash
# Check PostgreSQL is running
pg_isready

# Restart PostgreSQL
# macOS
brew services restart postgresql

# Linux
sudo systemctl restart postgresql

# Windows
# Services → PostgreSQL → Restart
```

#### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Start Redis
redis-server
```

#### Prisma Client Out of Sync

```bash
cd apps/api
pnpm prisma generate
```

#### Module Not Found

```bash
# Clear node_modules and reinstall
pnpm store prune
rm -rf node_modules
pnpm install
```

## Git Workflow

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add custom field support
fix: resolve bug assignment notification issue
docs: update API documentation
test: add tests for custom fields service
refactor: simplify test execution logic
chore: update dependencies
```

### Pull Request Process

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. Push to remote: `git push origin feature/my-feature`
4. Create Pull Request on GitHub
5. Request review
6. Address feedback
7. Merge after approval

## Environment Variables Reference

See `.env.example` files in `apps/api` and `apps/web` for complete reference.

## IDE Configuration

### VS Code Recommended Extensions

- ESLint
- Prettier
- Prisma
- GitLens
- Thunder Client (API testing)
- Error Lens

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.workingDirectories": ["apps/api", "apps/web"]
}
```

## Additional Resources

- [Fastify Documentation](https://www.fastify.io/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [pnpm Documentation](https://pnpm.io/)
