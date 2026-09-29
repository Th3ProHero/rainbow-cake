#!/usr/bin/env bash
# ═══════════════════════════════════════════════
# Rainbow Cake GO — Backup Script
# Creates a timestamped backup of the database
# and uploads volume.
# ═══════════════════════════════════════════════

set -euo pipefail

# Load .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

DB_USER="${POSTGRES_USER:-rcg}"
DB_NAME="${POSTGRES_DB:-rainbow_cake_go}"

echo "📦 Respaldando base de datos..."
docker compose exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/database.sql"
echo "✅ Base de datos respaldada en $BACKUP_DIR/database.sql"

echo "📦 Respaldando archivos (uploads)..."
docker compose cp app:/app/uploads "$BACKUP_DIR/uploads" 2>/dev/null || echo "⚠️  No se encontraron archivos en uploads"
echo "✅ Archivos respaldados en $BACKUP_DIR/uploads"

echo ""
echo "✅ Respaldo completo en: $BACKUP_DIR"
echo ""
echo "Para programar respaldos automáticos, agrega esta línea a crontab:"
echo "  0 3 * * * cd $(pwd) && ./scripts/backup.sh >> /var/log/rcg-backup.log 2>&1"
