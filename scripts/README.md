# Scripts Directory

Utility scripts for development, maintenance, and deployment.

## Structure

### `/dev`
Development and database utilities for local development.

See [dev/README.md](./dev/README.md) for details on:
- `check-users.js` - List database users
- `create-admin.js` - Create test users & channels
- `test-email.js` - Test email service
- `normalize-roles.js` - Data migration utility

### `/` (Root)
Database backup and restore scripts:

- `backup-db.sh` - Automated PostgreSQL database backup
- `restore-db.sh` - Restore database from backup

## Usage

### Development Utilities
```bash
cd apps/api
node ../../scripts/dev/check-users.js
```

### Database Operations
```bash
# Backup database
./scripts/backup-db.sh

# Restore database
./scripts/restore-db.sh
```

## Notes

- All scripts require proper environment configuration
- Database scripts need PostgreSQL connection details in `.env`
- Email service tests require Resend API credentials
