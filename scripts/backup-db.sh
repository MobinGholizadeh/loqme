#!/bin/bash
# ==============================================================================
# Automated Database Backup Routine for Loqme (لقمه) PostgreSQL
# Runs pg_dump, applies gzip compression, generates SHA256 checksum,
# and prunes backups older than 30 days.
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/loqme}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="loqme_db_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
CHECKSUM_PATH="${BACKUP_PATH}.sha256"

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

echo "================================================="
echo "🗄️  Starting Loqme Production Database Backup"
echo "⏰ Timestamp: ${TIMESTAMP}"
echo "📁 Destination: ${BACKUP_PATH}"
echo "================================================="

# Execute pg_dump with gzip compression
PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" pg_dump \
  -h "${POSTGRES_HOST:-localhost}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-postgres}" \
  -d "${POSTGRES_DB:-loqme}" \
  --format=plain \
  --no-owner \
  --no-privileges \
  | gzip -9 > "${BACKUP_PATH}"

# Generate SHA256 verification checksum
sha256sum "${BACKUP_PATH}" > "${CHECKSUM_PATH}"

BACKUP_SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
echo "✅ Database backup created successfully (${BACKUP_SIZE})"
echo "🔒 Checksum: $(cat "${CHECKSUM_PATH}")"

# Prune archives older than 30 days
echo "🧹 Pruning backups older than 30 days..."
find "${BACKUP_DIR}" -name "loqme_db_*.sql.gz*" -type f -mtime +30 -delete
echo "✨ Backup and retention cleanup complete."
