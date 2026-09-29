#!/usr/bin/env bash
# ═══════════════════════════════════════════════
# Rainbow Cake GO — Restore Script
# Restores a backup created by backup.sh
# Usage: ./scripts/restore.sh <backup-directory>
# ═══════════════════════════════════════════════

set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Uso: $0 <directorio-de-respaldo>"
  echo "Ejemplo: $0 backups/20240101_030000"
  exit 1
fi

BACKUP_DIR="$1"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "❌ Directorio no encontrado: $BACKUP_DIR"
  exit 1
fi

# Load .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

DB_USER="${POSTGRES_USER:-rcg}"
DB_NAME="${POSTGRES_DB:-rainbow_cake_go}"

echo "⚠️  Esto reemplazará la base de datos y los archivos actuales."
read -p "¿Continuar? (s/N): " confirm
if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
  echo "Cancelado."
  exit 0
fi

if [ -f "$BACKUP_DIR/database.sql" ]; then
  echo "📦 Restaurando base de datos..."
  docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
  docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_DIR/database.sql"
  echo "✅ Base de datos restaurada"
else
  echo "⚠️  No se encontró database.sql en $BACKUP_DIR"
fi

if [ -d "$BACKUP_DIR/uploads" ]; then
  echo "📦 Restaurando archivos..."
  docker compose cp "$BACKUP_DIR/uploads/." app:/app/uploads/
  echo "✅ Archivos restaurados"
else
  echo "⚠️  No se encontró directorio uploads en $BACKUP_DIR"
fi

echo ""
echo "✅ Restauración completa desde: $BACKUP_DIR"
