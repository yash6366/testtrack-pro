# Contributing Guide

Guidelines for contributing to TestTrack Pro.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Fork & Clone

```bash
# Fork the repository on GitHub
# Download your fork
git clone https://github.com/your-username/testtrack-pro.git
cd testtrack-pro

# Add upstream remote
git remote add upstream https://github.com/original-owner/testtrack-pro.git
```

### Setup Development Environment

See [DEVELOPMENT.md](./DEVELOPMENT.md) for local setup instructions.

## Development Workflow

### 1. Create a Branch

Use descriptive branch names:

```bash
# Features
git checkout -b feature/add-test-scheduling

# Bug fixes
git checkout -b fix/authentication-timeout

# Documentation
git checkout -b docs/update-api-reference

# Refactoring
git checkout -b refactor/simplify-test-execution-logic
```

### 2. Make Changes

- Follow existing code style
- Write tests for new features
- Update documentation as needed

### 3. Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (no logic changes)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Test additions
- `chore`: Build/dependency updates

Examples:

```
feat(test-execution): add retry mechanism
fix(auth): resolve JWT expiration on refresh
docs(api): update authentication section
refactor(services): extract common validation logic
test(bugs): add coverage for bug assignment
```

### 4. Keep Commits Clean

```bash
# Before pushing, review your changes
git diff

# Squash related commits
git rebase -i HEAD~3

# Amend last commit (if not pushed)
git commit --amend

# Undo unpushed commits
git reset HEAD~1
```

### 5. Push to Your Fork

```bash
git push origin feature/add-test-scheduling
```

### 6. Open a Pull Request

On GitHub:
1. Click "Compare & pull request"
2. Add clear description of changes
3. Link related issues: `Closes #123`
4. Request reviewers
5. Ensure CI passes

PR Description Template:

```markdown
## Description
Brief description of what this PR does.

## Related Issue
Closes #123

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Specific change 1
- Specific change 2

## Testing
Describe testing approach:
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guides
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Coverage maintained/improved
```

### 7. Code Review

Respond to feedback:
- Address comments directly
- Explain reasoning if disagreeing
- Push additional commits (don't force push during review)
- Request re-review when addressed

### 8. Merge

Once approved:
- Admin will merge PR
- Delete feature branch: `git branch -d feature/add-test-scheduling`

## Code Style

### JavaScript/TypeScript

Backend (Fastify + Node.js):

```javascript
// Use named exports
export class TestService {
  async getTest(id) {
    const test = await prisma.testCase.findUnique({ where: { id } });
    return test;
  }
}

// Use async/await
const result = await service.getTest(1);

// Use const by default
const name = 'Test';

// Use descriptive names
const testExecutionsByUser = filteredTests.filter(t => t.userId === userId);

// Comment complex logic
// Group tests by status for report generation
const testsByStatus = groupBy(tests, 'status');
```

Frontend (React + TypeScript):

```jsx
// Use functional components
export function TestList({ projectId }) {
  const [tests, setTests] = useState([]);

  // Hooks at top of component
  useEffect(() => {
    fetchTests(projectId).then(setTests);
  }, [projectId]);

  const handleSelect = (testId) => {
    // Handle selection
  };

  return (
    <div className="test-list">
      {tests.map(test => (
        <TestItem key={test.id} test={test} onSelect={handleSelect} />
      ))}
    </div>
  );
}

// Use prop destructuring
function TestItem({ test, onSelect }) {
  return <div onClick={() => onSelect(test.id)}>{test.title}</div>;
}
```

### Formatting

- **Indentation**: 2 spaces
- **Line length**: 100 characters (soft), 120 (hard)
- **Quotes**: Single quotes in JS, double in JSX attributes
- **Semicolons**: Always use (except in special cases)

Auto-format with Prettier:

```bash
pnpm format
```

### Linting

```bash
# Check existing issues
pnpm lint

# Fix automatically
pnpm lint:fix
```

## Testing Requirements

### New Features

Must include:
- Unit tests for business logic
- Integration tests for API routes
- Component tests for UI
- Minimum 80% coverage for new code

Example test file:

```javascript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { YourService } from '../yourService.js';

jest.mock('../../lib/prisma.js');

describe('YourService', () => {
  let service;

  beforeEach(() => {
    service = new YourService();
    jest.clearAllMocks();
  });

  it('should perform expected operation', async () => {
    // Test code
  });
});
```

### Bug Fixes

Include:
- Test that fails before fix
- Test that passes after fix
- Prevents regression

## Documentation Requirements

### For Features

Update:
- Code comments for complex logic
- [API-REFERENCE.md](./API-REFERENCE.md) for new endpoints
- [DEVELOPMENT.md](./DEVELOPMENT.md) for setup changes
- Component docstrings for complex UI
- [FEATURES.md](./FEATURES.md) for user-facing features

Example JSDoc:

```javascript
/**
 * Create a new test case
 * @async
 * @param {number} projectId - The project ID
 * @param {Object} data - Test case data
 * @param {string} data.title - Test title (required)
 * @param {string} data.description - Test description
 * @returns {Promise<TestCase>} Created test case
 * @throws {ValidationError} If data is invalid
 */
export async function createTestCase(projectId, data) {
  // Implementation
}
```

### For Bug Fixes (v0.6.2 Enhancement)

Include:
- What was broken
- Root cause analysis (use the root cause categories from bug fix documentation)
- What was fixed
- Testing performed to verify the fix
- Root cause category classification (helps track fix patterns)

When fixing bugs:
1. Test the fix thoroughly
2. Document in PR description:
   - Problem description
   - Root cause (use categories: DESIGN_DEFECT, IMPLEMENTATION_ERROR, etc.)
   - Solution employed
   - Verification steps
3. Link to any related bugs being fixed
4. Reviewers will verify the fix

Example PR description for a bug fix:

```markdown
## Bug: Authentication timeout on long-running requests

### Root Cause
**Category:** IMPLEMENTATION_ERROR
JWT token expiration logic wasn't accounting for long-running authenticated requests, causing premature timeout.

### Solution
Extended JWT token validity check to include grace period for active connections.

### Testing
- Tested with 30-minute background job ✅
- Tested with normal login flow ✅
- Tested refresh token flow ✅

Closes #456
```

## Performance Considerations

### Backend

- Use database indexes for frequently queried fields
- Implement pagination for large result sets
- Cache expensive operations with Redis
- Limit nested object queries
- Monitor slow queries

Example optimization:

```javascript
// Before: N+1 query
const tests = await prisma.testCase.findMany();
for (const test of tests) {
  test.executions = await prisma.testExecution.findMany({
    where: { testId: test.id }
  });
}

// After: Single query with relations
const tests = await prisma.testCase.findMany({
  include: { executions: true }
});
```

### Frontend

- Use lazy loading for routes
- Memoize expensive components
- Paginate large lists
- Debounce search inputs

Example optimization:

```jsx
// Memoize expensive component
const TestList = memo(function TestList({ tests }) {
  return tests.map(test => <TestItem key={test.id} test={test} />);
});

// Debounce search
const handleSearch = debounce((query) => {
  searchTests(query);
}, 300);
```

## Security

### Before Submitting

- No secrets in code (API keys, passwords)
- Input validation on all endpoints
- SQL injection prevented (use Prisma)
- CORS configured properly
- Rate limiting considered
- Authentication/authorization checked

### Dependencies

- Keep dependencies updated
- Review dependencies before adding
- Avoid dependencies with known vulnerabilities

```bash
# Check for vulnerabilities
npm audit
pnpm audit

# Update safely
pnpm update --interactive
```

## Changelog

Update [CHANGELOG.md](./CHANGELOG.md) for:
- Features
- Bug fixes
- Breaking changes
- Deprecations

Format:

```markdown
## [Version] - YYYY-MM-DD

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Breaking change description
```

## Release Process

### Version Numbering

Use [Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH`
- `1.2.3` = major version 1, minor version 2, patch version 3

Examples:
- Bug fix: `1.2.3` → `1.2.4`
- New feature: `1.2.3` → `1.3.0`
- Breaking change: `1.2.3` → `2.0.0`

### Release Steps

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit: `chore: bump version to v1.2.0`
4. Tag: `git tag v1.2.0`
5. Push: `git push origin main --tags`
6. Create GitHub Release with changelog

## Questions?

- Open a GitHub discussion
- Create an issue for bugs
- Ask in PR reviews
- Check existing documentation

## Recognition

Contributors will be recognized in:
- README.md
- CONTRIBUTORS.md
- Release notes

Thank you for contributing to TestTrack Pro! 🎉

## Related Resources

- [Development Guide](./DEVELOPMENT.md)
- [Testing Guide](./TESTING.md)
- [Security Guidelines](./SECURITY.md)
- [Architecture](./ARCHITECTURE.md)
