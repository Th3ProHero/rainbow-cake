#!/usr/bin/env bash
# ═══════════════════════════════════════════════
# Rainbow Cake GO — Port availability checker
# Verifies that configured ports are free before
# starting Docker Compose.
# ═══════════════════════════════════════════════

set -euo pipefail

# Load .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

APP_PORT="${APP_HOST_PORT:-18473}"
DB_PORT="${DB_HOST_PORT:-15439}"
MAILPIT_UI="${MAILPIT_UI_PORT:-18025}"
MAILPIT_SMTP="${MAILPIT_SMTP_PORT:-11025}"

PORTS=("$APP_PORT" "$DB_PORT" "$MAILPIT_UI" "$MAILPIT_SMTP")
NAMES=("App" "PostgreSQL" "Mailpit UI" "Mailpit SMTP")

has_error=false

for i in "${!PORTS[@]}"; do
  port="${PORTS[$i]}"
  name="${NAMES[$i]}"

  if ss -ltn 2>/dev/null | grep -q ":${port} "; then
    echo "❌ Puerto ${port} (${name}) está ocupado"
    has_error=true
  else
    echo "✅ Puerto ${port} (${name}) disponible"
  fi
done

if [ "$has_error" = true ]; then
  echo ""
  echo "⚠️  Algunos puertos están en uso. Modifica las variables en .env o libera los puertos."
  exit 1
fi

echo ""
echo "✅ Todos los puertos están disponibles"
