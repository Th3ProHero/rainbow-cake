# ═══════════════════════════════════════════════
# Rainbow Cake GO — Makefile
# ═══════════════════════════════════════════════

.PHONY: up down logs migrate seed backup restore dev check-ports

# Start all services (production)
up: check-ports
	docker compose up -d --build

# Start with Mailpit for development
dev: check-ports
	docker compose --profile dev up -d --build

# Stop all services
down:
	docker compose --profile dev down

# View logs
logs:
	docker compose logs -f

# Run Prisma migrations
migrate:
	docker compose run --rm migrate

# Run seed script
seed:
	docker compose exec app npx prisma db seed

# Backup database and uploads
backup:
	./scripts/backup.sh

# Restore from backup
restore:
	@echo "Usage: ./scripts/restore.sh <backup-directory>"

# Check if ports are available
check-ports:
	@bash scripts/check-ports.sh
