#!/bin/bash

###############################################################################
# DATABASE BACKUP SCRIPT
# Creates PostgreSQL dump and uploads to S3-compatible storage
# Usage: ./backup-db.sh [environment]
###############################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ENVIRONMENT="${1:-production}"
DB_NAME="${DB_NAME:-testtrack}"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
S3_BUCKET="${S3_BUCKET:-testtrack-backups}"
S3_ENDPOINT="${S3_ENDPOINT:-}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Backup file naming
BACKUP_FILE="${BACKUP_DIR}/testtrack_${ENVIRONMENT}_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
BACKUP_METADATA="${BACKUP_DIR}/testtrack_${ENVIRONMENT}_${TIMESTAMP}.json"

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

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

log_info "Starting database backup for environment: $ENVIRONMENT"
log_info "Database: $DB_NAME at $DB_HOST:$DB_PORT"

# Step 1: Create PostgreSQL dump
log_info "Creating PostgreSQL dump..."
if PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    -F p \
    -f "$BACKUP_FILE"; then
    log_info "Database dump created: $BACKUP_FILE"
else
    log_error "Failed to create database dump"
    exit 1
fi

# Step 2: Compress the backup
log_info "Compressing backup..."
if gzip -f "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
    log_info "Backup compressed: $COMPRESSED_FILE (Size: $BACKUP_SIZE)"
else
    log_error "Failed to compress backup"
    exit 1
fi

# Step 3: Create metadata file
log_info "Creating backup metadata..."
cat > "$BACKUP_METADATA" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "environment": "$ENVIRONMENT",
  "database": "$DB_NAME",
  "host": "$DB_HOST",
  "port": "$DB_PORT",
  "file": "$(basename $COMPRESSED_FILE)",
  "size": "$BACKUP_SIZE",
  "created_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "retention_days": $RETENTION_DAYS
}
EOF

log_info "Metadata created: $BACKUP_METADATA"

# Step 4: Upload to S3 (if configured)
if [ -n "$S3_BUCKET" ] && command -v aws &> /dev/null; then
    log_info "Uploading to S3: s3://$S3_BUCKET/"
    
    S3_PATH="s3://$S3_BUCKET/$ENVIRONMENT/$(basename $COMPRESSED_FILE)"
    S3_METADATA_PATH="s3://$S3_BUCKET/$ENVIRONMENT/$(basename $BACKUP_METADATA)"
    
    # Set S3 endpoint if provided (for S3-compatible services)
    S3_ARGS=""
    if [ -n "$S3_ENDPOINT" ]; then
        S3_ARGS="--endpoint-url $S3_ENDPOINT"
    fi
    
    if aws s3 cp $S3_ARGS "$COMPRESSED_FILE" "$S3_PATH"; then
        log_info "Backup uploaded to: $S3_PATH"
    else
        log_error "Failed to upload backup to S3"
        exit 1
    fi
    
    if aws s3 cp $S3_ARGS "$BACKUP_METADATA" "$S3_METADATA_PATH"; then
        log_info "Metadata uploaded to: $S3_METADATA_PATH"
    else
        log_warn "Failed to upload metadata to S3"
    fi
else
    log_warn "S3 upload skipped (S3_BUCKET not set or AWS CLI not installed)"
fi

# Step 5: Clean up old local backups
log_info "Cleaning up local backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "testtrack_${ENVIRONMENT}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "testtrack_${ENVIRONMENT}_*.json" -type f -mtime +$RETENTION_DAYS -delete
log_info "Old backups cleaned up"

# Step 6: Verify backup integrity
log_info "Verifying backup integrity..."
if gzip -t "$COMPRESSED_FILE"; then
    log_info "✅ Backup verification successful"
else
    log_error "❌ Backup verification failed"
    exit 1
fi

log_info "==================================="
log_info "Backup completed successfully!"
log_info "File: $COMPRESSED_FILE"
log_info "Size: $BACKUP_SIZE"
log_info "==================================="

exit 0
