# 🚀 DEPLOYMENT GUIDE - Ubuntu Server

## Requisitos del servidor:
- Ubuntu 20.04 o superior
- Docker y Docker Compose instalados
- Puerto 80 o 443 disponible
- Mínimo 2GB RAM, 10GB disco

---

## 1. Instalar Docker en Ubuntu

```bash
# Actualizar sistema
sudo apt update
sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose-plugin -y

# Verificar instalación
docker --version
docker compose version
```

---

## 2. Clonar el repositorio

```bash
# Ir al directorio home
cd ~

# Clonar (reemplaza con tu URL)
git clone https://github.com/TU_USUARIO/rainbow-cake-go.git
cd rainbow-cake-go
```

---

## 3. Configurar variables de entorno

```bash
# Copiar ejemplo
cp .env.example .env

# Editar con nano o vim
nano .env

# IMPORTANTE: Cambiar estos valores:
# - AUTH_SECRET (genera uno random de 32 caracteres)
# - APP_URL (tu dominio o IP del servidor)
# - ADMIN_SEED_PASSWORD (contraseña segura)
# - POSTGRES_PASSWORD (contraseña segura)
```

---

## 4. Generar secreto seguro (AUTH_SECRET)

```bash
# Generar secret de 32 caracteres
openssl rand -base64 32
# Copiar el resultado y pegarlo en AUTH_SECRET en .env
```

---

## 5. Levantar los servicios

```bash
# Construir e iniciar todo
docker compose up -d --build

# Ver logs
docker compose logs -f

# Verificar que todo esté corriendo
docker compose ps
```

---

## 6. Ejecutar migraciones y seed

```bash
# Ejecutar migraciones de base de datos
docker compose exec app npx prisma migrate deploy

# Poblar con datos iniciales (usuario admin)
docker compose exec app npx prisma db seed
```

---

## 7. Verificar que funciona

```bash
# Ver logs de la app
docker compose logs -f app

# La app debería estar en:
# http://TU_IP:18473
# o el puerto que configuraste en APP_HOST_PORT
```

---

## 8. Configurar Nginx (opcional pero recomendado)

```bash
# Instalar Nginx
sudo apt install nginx -y

# Crear configuración
sudo nano /etc/nginx/sites-available/rainbow-cake-go
```

Contenido del archivo:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;  # Cambiar por tu dominio o IP

    location / {
        proxy_pass http://localhost:18473;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/rainbow-cake-go /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 9. Configurar SSL con Certbot (HTTPS)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado (reemplaza tu-dominio.com)
sudo certbot --nginx -d tu-dominio.com

# Certbot configurará automáticamente HTTPS
```

---

## 10. Comandos útiles

```bash
# Ver logs
docker compose logs -f

# Reiniciar servicios
docker compose restart

# Detener todo
docker compose down

# Actualizar código
git pull
docker compose up -d --build

# Backup de base de datos
./scripts/backup.sh

# Acceder a la base de datos
docker compose exec db psql -U rcg -d rainbow_cake_go
```

---

## 11. Credenciales iniciales

Después del seed, puedes acceder con:

- **URL:** http://TU_IP:18473/login
- **Email:** admin@rainbowcakego.com
- **Password:** El que configuraste en ADMIN_SEED_PASSWORD

**¡IMPORTANTE!** Cambia la contraseña después del primer login.

---

## 12. Monitoreo y mantenimiento

```bash
# Ver uso de recursos
docker stats

# Limpiar logs viejos
docker compose logs --since 24h > logs-backup.txt
docker compose down
docker compose up -d

# Actualizar Docker images
docker compose pull
docker compose up -d --build
```

---

## Troubleshooting

### La app no inicia:
```bash
docker compose logs app
# Revisa errores de variables de entorno o migraciones
```

### No puedo conectar a la base de datos:
```bash
docker compose ps db
# Verifica que el contenedor db esté "healthy"
```

### Olvidé la contraseña del admin:
```bash
# Resetear con Prisma Studio
docker compose exec app npx prisma studio
# Accede en http://localhost:5555 y edita el usuario
```

---

¡Listo! Tu app está corriendo en producción 🎉
