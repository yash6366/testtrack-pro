# Development Utility Scripts

This directory contains utility scripts for development and database management.

## Scripts

### `check-users.js`
Lists all users in the database with verification status.

**Usage:**
```bash
cd apps/api
node ../../scripts/dev/check-users.js
```

### `create-admin.js`
Creates initial test users (admin, developer, tester) and a general channel.

**Usage:**
```bash
cd apps/api
node ../../scripts/dev/create-admin.js
```

**Test Credentials:**
- Admin: `admin@gmail.com` / `Admin@123`
- Developer: `dev@test.com` / `test123`
- Tester: `tester@test.com` / `test123`

### `test-email.js`
Tests the Resend email service configuration.

**Usage:**
```bash
cd apps/api
node ../../scripts/dev/test-email.js
```

**Requirements:**
- `RESEND_API_KEY` environment variable
- `RESEND_FROM_EMAIL` environment variable

### `normalize-roles.js`
Data migration utility that normalizes all user roles to uppercase.

**Usage:**
```bash
cd apps/api
node ../../scripts/dev/normalize-roles.js
```

## Notes

- All scripts require a valid database connection (PostgreSQL)
- Environment variables must be configured in `apps/api/.env`
- Scripts use Prisma Client for database operations
