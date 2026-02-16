# @testtrack/shared

Shared TypeScript types, utilities, and constants used across TestTrack Pro monorepo.

## Overview

This package provides common code shared between the frontend (`apps/web`) and backend (`apps/api`) applications, ensuring type safety and code consistency across the entire stack.

## Features

- **Type Definitions**: Shared TypeScript interfaces and types
- **Constants**: Enums, status codes, and shared values
- **Utilities**: Common helper functions
- **Validation Schemas**: Shared validation logic (if applicable)

## Installation

This package is part of the monorepo workspace and is automatically linked:

```bash
# From project root
pnpm install
```

## Usage

### In Backend (apps/api)

```javascript
// Import shared types
import type { User, TestCase, Bug } from '@testtrack/shared';

// Use in your code
function getUserById(id: number): User {
  // ...
}
```

### In Frontend (apps/web)

```typescript
// Import shared types
import type { TestCaseStatus, BugSeverity } from '@testtrack/shared';

// Use in components
interface Props {
  status: TestCaseStatus;
  severity: BugSeverity;
}
```

## Package Structure

```
packages/shared/
├── src/
│   ├── types/           # TypeScript type definitions
│   │   ├── user.ts
│   │   ├── testCase.ts
│   │   ├── bug.ts
│   │   └── index.ts
│   ├── constants/       # Shared constants
│   │   ├── status.ts
│   │   ├── roles.ts
│   │   └── index.ts
│   ├── utils/          # Utility functions
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── index.ts
│   └── index.ts        # Main entry point
├── package.json
└── tsconfig.json
```

## Available Types

### User Types

```typescript
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  DEVELOPER = 'DEVELOPER',
  TESTER = 'TESTER',
  GUEST = 'GUEST'
}
```

### Test Case Types

```typescript
export interface TestCase {
  id: number;
  projectId: number;
  name: string;
  description?: string;
  type: TestType;
  priority: Priority;
  status: TestCaseStatus;
  steps: TestStep[];
}

export enum TestType {
  FUNCTIONAL = 'FUNCTIONAL',
  INTEGRATION = 'INTEGRATION',
  REGRESSION = 'REGRESSION',
  SMOKE = 'SMOKE',
  SECURITY = 'SECURITY'
}

export enum Priority {
  P0 = 'P0',
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4'
}

export enum TestCaseStatus {
  DRAFT = 'DRAFT',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  DEPRECATED = 'DEPRECATED'
}
```

### Bug Types

```typescript
export interface Bug {
  id: number;
  title: string;
  description: string;
  severity: BugSeverity;
  status: BugStatus;
  assignedToId?: number;
  reportedById: number;
}

export enum BugSeverity {
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  TRIVIAL = 'TRIVIAL'
}

export enum BugStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED'
}
```

## Constants

### Role Permissions

```typescript
export const ROLE_PERMISSIONS = {
  ADMIN: ['*'],
  TESTER: ['test:*', 'execution:*', 'bug:create', 'bug:read'],
  DEVELOPER: ['bug:*', 'test:read', 'execution:read'],
  GUEST: ['test:read', 'bug:read']
};
```

### Status Colors

```typescript
export const STATUS_COLORS = {
  PASS: 'green',
  FAIL: 'red',
  SKIP: 'yellow',
  BLOCKED: 'gray'
};
```

## Utility Functions

### Validation

```typescript
import { isValidEmail, isValidPassword } from '@testtrack/shared';

if (!isValidEmail(email)) {
  throw new Error('Invalid email format');
}
```

### Formatting

```typescript
import { formatDate, formatDuration } from '@testtrack/shared';

const formattedDate = formatDate(new Date());
const duration = formatDuration(milliseconds);
```

## Development

### Adding New Types

1. Create a new file in `src/types/`
2. Define your types/interfaces
3. Export from `src/types/index.ts`
4. Export from main `src/index.ts`

```typescript
// src/types/newFeature.ts
export interface NewFeature {
  id: number;
  name: string;
}

// src/types/index.ts
export * from './newFeature';

// src/index.ts
export * from './types';
```

### Building

```bash
# Build the package
pnpm build

# Watch mode during development
pnpm dev
```

### Type Checking

```bash
# Run TypeScript type check
pnpm type-check
```

## Best Practices

1. **Keep it DRY**: Only add code that's truly shared between apps
2. **Type Safety**: Always use TypeScript for type definitions
3. **Documentation**: Document all exported types and functions
4. **Versioning**: Update package version when making breaking changes
5. **Testing**: Add tests for utility functions

## Dependencies

Minimal dependencies to keep the package lightweight:
- TypeScript (dev dependency)
- No runtime dependencies

## Contributing

When adding to this package:
1. Ensure types are used in both frontend and backend
2. Add JSDoc comments for all exports
3. Update this README with usage examples
4. Run type checking before committing

## License

MIT License - See [LICENSE](../../LICENSE) file for details.
