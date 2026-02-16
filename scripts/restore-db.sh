#!/bin/bash

###############################################################################
# DATABASE RESTORE SCRIPT
# Restores PostgreSQL database from backup
# Usage: ./restore-db.sh <backup-file> [environment]
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
BACKUP_FILE="${1:-}"
ENVIRONMENT="${2:-production}"
DB_NAME="${DB_NAME:-testtrack}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
S3_BUCKET="${S3_BUCKET:-testtrack-backups}"
S3_ENDPOINT="${S3_ENDPOINT:-}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 <backup-file> [environment]"
    echo ""
    echo "Examples:"
    echo "  $0 ./backups/testtrack_production_20260212_120000.sql.gz"
    echo "  $0 s3://testtrack-backups/production/testtrack_production_20260212_120000.sql.gz"
    echo ""
    exit 1
}

# Validate arguments
if [ -z "$BACKUP_FILE" ]; then
    log_error "No backup file specified"
    show_usage
fi

log_info "Starting database restore for environment: $ENVIRONMENT"
log_info "Backup file: $BACKUP_FILE"

# Step 1: Download from S3 if needed
TEMP_DIR=$(mktemp -d)
LOCAL_BACKUP_FILE=""

if [[ "$BACKUP_FILE" == s3://* ]]; then
    log_info "Downloading backup from S3..."
    
    S3_ARGS=""
    if [ -n "$S3_ENDPOINT" ]; then
        S3_ARGS="--endpoint-url $S3_ENDPOINT"
    fi
    
    BACKUP_FILENAME=$(basename "$BACKUP_FILE")
    LOCAL_BACKUP_FILE="$TEMP_DIR/$BACKUP_FILENAME"
    
    if aws s3 cp $S3_ARGS "$BACKUP_FILE" "$LOCAL_BACKUP_FILE"; then
        log_info "Backup downloaded: $LOCAL_BACKUP_FILE"
    else
        log_error "Failed to download backup from S3"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
else
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    LOCAL_BACKUP_FILE="$BACKUP_FILE"
fi

# Step 2: Verify backup file
log_info "Verifying backup file..."
if [[ "$LOCAL_BACKUP_FILE" == *.gz ]]; then
    if gzip -t "$LOCAL_BACKUP_FILE"; then
        log_info "✅ Backup file verified"
    else
        log_error "❌ Backup file is corrupted"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
fi

# Step 3: Prompt for confirmation
log_warn "⚠️  WARNING: This will REPLACE the current database!"
log_warn "Database: $DB_NAME at $DB_HOST:$DB_PORT"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log_info "Restore cancelled by user"
    rm -rf "$TEMP_DIR"
    exit 0
fi

# Step 4: Create pre-restore backup
log_info "Creating pre-restore backup of current database..."
PRE_RESTORE_BACKUP="$TEMP_DIR/pre_restore_$(date +%Y%m%d_%H%M%S).sql"
if PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F p \
    -f "$PRE_RESTORE_BACKUP"; then
    log_info "Pre-restore backup created: $PRE_RESTORE_BACKUP"
else
    log_warn "Failed to create pre-restore backup (continuing anyway)"
fi

# Step 5: Decompress if needed
RESTORE_FILE=""
if [[ "$LOCAL_BACKUP_FILE" == *.gz ]]; then
    log_info "Decompressing backup..."
    RESTORE_FILE="$TEMP_DIR/$(basename ${LOCAL_BACKUP_FILE%.gz})"
    gunzip -c "$LOCAL_BACKUP_FILE" > "$RESTORE_FILE"
    log_info "Backup decompressed"
else
    RESTORE_FILE="$LOCAL_BACKUP_FILE"
fi

# Step 6: Restore database
log_info "Restoring database from backup..."
if PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -f "$RESTORE_FILE"; then
    log_info "✅ Database restored successfully!"
else
    log_error "❌ Database restore failed!"
    log_warn "Pre-restore backup available at: $PRE_RESTORE_BACKUP"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Step 7: Verify restore
log_info "Verifying database connections..."
if PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -c "SELECT COUNT(*) FROM \"User\";" > /dev/null 2>&1; then
    log_info "✅ Database verification successful"
else
    log_error "❌ Database verification failed"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Cleanup
log_info "Cleaning up temporary files..."
if [[ "$BACKUP_FILE" == s3://* ]]; then
    rm -f "$LOCAL_BACKUP_FILE"
fi
rm -f "$RESTORE_FILE"
# Keep pre-restore backup for safety
if [ -f "$PRE_RESTORE_BACKUP" ]; then
    SAFETY_BACKUP="./pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"
    mv "$PRE_RESTORE_BACKUP" "$SAFETY_BACKUP"
    log_info "Pre-restore backup saved to: $SAFETY_BACKUP"
fi
rm -rf "$TEMP_DIR"

log_info "==================================="
log_info "✅ Restore completed successfully!"
log_info "==================================="

exit 0
