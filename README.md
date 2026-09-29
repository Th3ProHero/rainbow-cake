# Rainbow Cake GO 🍰

Aplicación web mobile-first para llevar el control de ventas manuales de productos (merch). No es una tienda online: funciona como consola de administración, control de cuentas y difusión por WhatsApp.

## Requisitos previos

- **Docker** y **Docker Compose** v2+
- **Node.js** 20+ y **npm** (solo para desarrollo local)
- Un servidor **Ubuntu** para producción (o cualquier sistema con Docker)

## Inicio rápido (desarrollo)

```bash
# 1. Clonar y configurar
cp .env.example .env
# Edita .env con tus valores (mínimo: AUTH_SECRET)

# 2. Instalar dependencias
npm install

# 3. Levantar base de datos y Mailpit
docker compose --profile dev up -d db mailpit

# 4. Ejecutar migraciones
npx prisma migrate dev

# 5. Crear admin y datos iniciales
npx prisma db seed

# 6. Iniciar la app
npm run dev
```

La app estará en `http://localhost:18473`.
Mailpit (correos de prueba) en `http://localhost:18025`.

## Inicio rápido (Docker Compose completo)

```bash
cp .env.example .env
# Edita .env — genera AUTH_SECRET con: openssl rand -base64 32

# Verificar puertos disponibles
bash scripts/check-ports.sh

# Levantar todo (producción)
make up

# O con Mailpit para desarrollo
make dev
```

## Puertos

| Servicio | Puerto | Variable |
|---|---|---|
| App | 18473 | `APP_HOST_PORT` |
| PostgreSQL (solo debug, localhost) | 15439 | `DB_HOST_PORT` |
| Mailpit Web (solo dev) | 18025 | `MAILPIT_UI_PORT` |
| Mailpit SMTP (solo dev) | 11025 | `MAILPIT_SMTP_PORT` |

## Variables de entorno

Ver `.env.example` para la lista completa documentada.

### Variables críticas para producción

- `AUTH_SECRET`: Secreto para firmar JWT. Genera con `openssl rand -base64 32`.
- `DATABASE_URL`: URL de conexión a PostgreSQL.
- `APP_URL`: URL pública de la app (para enlaces en correos).
- `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`: Credenciales del primer admin.
- `SMTP_HOST` / `SMTP_PORT`: Servidor SMTP para correos.

## Respaldos

```bash
# Crear respaldo (base de datos + archivos)
make backup

# Restaurar
./scripts/restore.sh backups/20240101_030000

# Cron automático (ejemplo: cada día a las 3am)
0 3 * * * cd /ruta/al/proyecto && ./scripts/backup.sh >> /var/log/rcg-backup.log 2>&1
```

## Despliegue con reverse proxy

La app está preparada para funcionar detrás de Nginx, Caddy o Traefik.
Configura `APP_URL` con tu dominio y apunta el proxy a `localhost:18473`.

Ejemplo con Caddy:
```
tudominio.com {
  reverse_proxy localhost:18473
}
```

## Roles

- **USER**: Ve el catálogo, hace pedidos, ve el estado de sus artículos.
- **ADMIN**: Gestiona productos, pedidos, comprobantes, usuarios y configuración.

## Tecnologías

- Next.js (App Router) + TypeScript
- PostgreSQL 16 + Prisma
- Tailwind CSS v4 + Radix UI
- bcrypt + JWT (jose) para autenticación
- Nodemailer para correos
- Docker multi-etapa

## Documentación

- `docs/DECISIONS.md` — Decisiones técnicas
