<USER_REQUEST>
# Prompt para Antigravity: Rainbow Cake GO

Actúa como arquitecto y desarrollador full-stack senior. Vas a construir **Rainbow Cake GO**, una aplicación web mobile-first para llevar el control de ventas manuales de productos (merch). Antes de escribir código, genera un **plan de implementación** con arquitectura, esquema de base de datos, estructura de carpetas y fases, y espera mi aprobación. Después construye por fases (sección 14), deja cada fase funcionando y probada antes de pasar a la siguiente.

Los identificadores del código (tablas, enums, variables, rutas) van en inglés. Toda la interfaz y los correos van en **español**. Si una decisión no está definida aquí, toma la opción más simple y razonable y regístrala en `docs/DECISIONS.md`; no te detengas a preguntar.

---

## 1. Contexto del negocio

Las ventas y la coordinación se hacen **manualmente por WhatsApp** y las entregas son **en persona**. La app **no es una tienda online**: no hay pagos en línea, pasarelas, envíos ni checkout. Funciona como **consola de administración, control de cuentas y difusión**:

- El admin publica un catálogo de productos con categorías y ofertas.
- Los usuarios se registran, ven el catálogo y hacen pedidos.
- El admin lleva el seguimiento de **cada artículo** (no solo del pedido): a veces se entrega parcialmente, uno a uno, o hay artículos en tránsito, llegados a almacén sin entregar, o cancelados.
- Los usuarios pagan a destiempo, a veces un solo artículo y a veces varios. El admin adjunta **comprobantes de pago** a uno o varios artículos.
- La app avisa por correo al admin y al usuario en los momentos clave, y ofrece enlaces de WhatsApp para contacto.

**Fuera de alcance:** pagos online, cálculo de envíos, inventario automático, multi-tienda, API oficial de WhatsApp (solo dejar la interfaz preparada, sección 10).

## 2. Stack técnico

- **Next.js** (App Router) con **TypeScript**, `output: "standalone"` para Docker.
- **PostgreSQL 16** con **Prisma** (migraciones versionadas).
- **Tailwind CSS** + componentes accesibles (shadcn/ui o Radix). Validación con **zod**.
- Autenticación propia con sesión en cookie `httpOnly`, `SameSite=Lax`, contraseñas con **argon2id** (o bcrypt con costo ≥ 12).
- Correos con **Nodemailer** por SMTP configurable. Cola en base de datos (tabla outbox) con reintentos, procesada por un worker en el mismo contenedor o en uno aparte. No usar Redis.
- Archivos (comprobantes e imágenes) en un volumen de Docker, **fuera del directorio público**.
- PWA básica: `manifest.webmanifest`, íconos y `theme-color` rosa para instalarla en el móvil. No se requiere modo offline.
- Pruebas: **Vitest** para la lógica de dominio y **Playwright** para los flujos críticos.

## 3. Roles y permisos

Solo dos roles: `USER` y `ADMIN`. Aplica la autorización en el middleware **y** dentro de cada server action o route handler (nunca confiar solo en ocultar botones). Un usuario solo ve sus propios pedidos, artículos y comprobantes.

## 4. Modelo de datos

Usa `Decimal` para dinero, `cuid` para ids, `createdAt`/`updatedAt` en todo y borrado lógico donde se indica.

- **User**: name, email (único, sin distinguir mayúsculas), username (único), passwordHash, role, whatsapp (**obligatorio**: teléfono con código de país guardado en formato E.164, por ejemplo `+5215512345678`; lo pide el registro y solo lo ven el propio usuario y el admin; no es único, porque dos personas pueden compartir número), internalNotes (solo admin), isActive.
- **Category**: name, slug, sortOrder.
- **Product**: sku (único), name, description, categoryId, merchType (texto con sugerencias de valores existentes), price, offerPrice (opcional), offerStartsAt/offerEndsAt (opcionales), releaseDate (fecha estimada de disponibilidad o llegada), availability (`IN_STOCK` Disponible, `ON_DEMAND` Bajo pedido, `OUT_OF_STOCK` Agotado), status (`ACTIVE`, `HIDDEN`), stock (opcional e informativo, no se descuenta solo), imagePath, archivedAt. **Eliminar = archivar**, porque los pedidos históricos dependen del producto.
- **Order**: code legible y secuencial (`RCG-000123`), userId, note. El estado del pedido **se deriva** de sus artículos: *Abierto* si queda algún artículo sin cerrar, *Completado* si todos están entregados o cancelados (con al menos uno entregado), *Cancelado* si todos están cancelados.
- **OrderItem**: orderId, productId, **snapshots** de nombre, SKU y precio unitario al momento del pedido (aplicando la oferta vigente), quantity, quantityDelivered, quantityCancelled, status.
  - `status`: `PENDING` Pendiente, `IN_TRANSIT` En tránsito, `IN_WAREHOUSE` En almacén (llegó, no entregado), `PARTIALLY_DELIVERED` Entrega parcial, `DELIVERED` Entregado, `CANCELLED` Cancelado.
- **OrderItemLog**: bitácora de cada cambio (orderItemId, fromStatus, toStatus, deliveredDelta, changedById, note, createdAt).
- **Payment** (comprobante): userId, paidAt, amount (opcional), method (texto libre: transferencia, efectivo, etc.), reference, note, filePath, mimeType, originalName, uploadedById.
- **PaymentAllocation**: paymentId, orderItemId, amountApplied. Relación **muchos a muchos**: un comprobante puede cubrir varios artículos y un artículo puede tener varios comprobantes (pagos parciales).
- **EmailOutbox**: type, toEmail, subject, html, status (`PENDING`/`SENT`/`FAILED`), attempts, lastError, sentAt, relacionados opcionales.
- **AuditLog**: acciones del admin (quién, qué, cuándo, entidad).
- **MessageTemplate**: name, body con variables (`{nombre}`, `{pedido}`, `{producto}`, `{estado}`, `{saldo}`), isActive. Editables por el admin.
- **WhatsAppContactLog**: userId, adminId, orderItemId (opcional), message, createdAt.
- **Setting**: clave/valor (número de WhatsApp del negocio, correos de aviso al admin, nombre del negocio).

## 5. Reglas de negocio (implementar como funciones puras en `src/lib/domain` y cubrirlas con pruebas)

1. **Entrega parcial**: `quantityDelivered` nunca supera `quantity − quantityCancelled`. Si `0 < entregado < cantidad` el estado pasa solo a `PARTIALLY_DELIVERED`; si se entrega todo, a `DELIVERED`.
2. **Cancelación**: cancelar un artículo cancela las unidades **aún no entregadas** (`quantityCancelled = quantity − quantityDelivered`). Si ya había entregas parciales, el estado queda `DELIVERED` con lo entregado.
3. **Monto a pagar** de un artículo = `unitPrice × (quantity − quantityCancelled)`.
4. **Estado de pago del artículo** (derivado): `Sin pago`, `Pago parcial`, `Pagado`. Saldo = monto a pagar − suma de `amountApplied`. Un saldo negativo se muestra como **saldo a favor** (por ejemplo, si se canceló un artículo ya pagado).
5. **Ofertas**: una oferta está activa si hay `offerPrice` y la fecha actual está dentro de su rango (o no tiene rango). El precio del pedido queda congelado en el snapshot.
6. Un usuario puede cancelar sus artículos **solo mientras estén en `PENDING`**; se avisa al admin. El admin puede cambiar cualquier estado en cualquier momento (incluso retroceder), y todo queda en la bitácora.
7. No se pueden pedir productos `OUT_OF_STOCK`, `HIDDEN` ni archivados.
8. Cada cambio de estado, entrega o pago registra una entrada en la bitácora y en el AuditLog.

## 6. Área del usuario (mobile-first)

- **Registro**: nombre, correo, usuario, **teléfono de WhatsApp (obligatorio)** y contraseña (mínimo 10 caracteres, con confirmación). El teléfono se captura con selector de país (por defecto `DEFAULT_PHONE_COUNTRY`), se valida con `libphonenumber-js` y se guarda normalizado en E.164. Sin un número válido no se crea la cuenta. Inicio de sesión con correo **o** usuario. Recuperar y restablecer contraseña por correo con token de un solo uso y caducidad. Verificación de correo opcional mediante `REQUIRE_EMAIL_VERIFICATION` (por defecto apagada).
- **Catálogo**: cuadrícula de 2 columnas en móvil, búsqueda, filtro por categoría y tipo de merch, etiquetas de oferta, agotado y bajo pedido.
- **Detalle de producto** y **carrito** (en el cliente). Al enviar el pedido se crea la orden, **sin pago**, y se muestra una pantalla de confirmación con el botón para **continuar por WhatsApp** con el mensaje prellenado (código de pedido y artículos).
- **Mis pedidos**: lista de pedidos; dentro de cada uno, **cada artículo** con su estado, cantidad entregada de cantidad pedida, estado de pago, saldo y los comprobantes asociados (solo lectura), además del historial de estados.
- **Perfil**: editar nombre, WhatsApp (no puede quedar vacío) y contraseña.

## 7. Panel de administración

Sidebar en escritorio y menú lateral desplegable en móvil. Las tablas se convierten en listas apiladas en pantallas pequeñas.

- **Inicio**: conteo de artículos por estado, total pendiente de cobro, pedidos recientes y artículos que llevan mucho tiempo en almacén sin entregar.
- **Artículos (vista principal)**: una tabla de todos los `OrderItem` de todos los usuarios, más allá de las órdenes de compra.
  - Filtros combinables: usuario, estado del artículo, estado de pago, categoría, producto o SKU, rango de fechas y búsqueda de texto. Opción de agrupar por usuario.
  - **Acciones en lote** sobre lo seleccionado: cambiar estado, registrar entrega (con cantidad), adjuntar comprobante, contactar por WhatsApp.
  - Exportar a CSV lo filtrado.
- **Productos**: CRUD con búsqueda y filtros (categoría, estado, disponibilidad), subir imagen, poner y quitar oferta con fechas, duplicar, archivar y restaurar, cambio de disponibilidad en lote.
- **Categorías**: CRUD y orden.
- **Usuarios**: el admin ve a **todos los usuarios registrados**.
  - Listado con nombre, usuario, correo, **teléfono de WhatsApp**, artículos abiertos, saldo pendiente y último contacto por WhatsApp. Búsqueda por nombre, usuario, correo o teléfono, y filtros (con saldo pendiente, con artículos en almacén sin entregar, sin pedidos, inactivos).
  - Botón **"Escribir por WhatsApp"** en cada fila: abre el chat con ese usuario con un mensaje prellenado que el admin elige de una plantilla.
  - Ficha con datos, notas internas, todos sus artículos, totales (pedido, pagado, saldo), comprobantes, historial de contactos por WhatsApp y el mismo botón. El admin puede corregir el teléfono del usuario.
  - Desactivar usuario y enviar enlace de restablecimiento de contraseña.
  - **Difusión asistida**: el admin selecciona varios usuarios (por ejemplo, todos los que tienen artículos "En almacén"), elige una plantilla y obtiene una lista con un botón de WhatsApp por persona. Cada botón abre el chat con el mensaje ya personalizado y marca al usuario como contactado. WhatsApp no permite el envío masivo automático mediante enlaces, así que cada mensaje se envía manualmente desde el teléfono o WhatsApp Web.
- **Comprobantes**: subir uno o varios archivos (JPG, PNG, PDF, máximo 10 MB cada uno) y **asignarlos a uno o varios artículos del mismo usuario**, con el monto aplicado por artículo. Por defecto se sugiere el saldo pendiente de cada artículo y el admin lo ajusta.
- **Configuración**: número de WhatsApp del negocio, correos de aviso al admin, nombre del negocio y plantillas de mensaje de WhatsApp.
- **Actividad**: visor del AuditLog y del EmailOutbox (con reenvío de fallidos).

## 8. Correos

Plantillas HTML sencillas con la identidad visual (sección 11), en español, con enlace directo a la pantalla correspondiente.

| Evento | Destinatario |
|---|---|
| Registro de usuario | Usuario (bienvenida); admin (aviso) |
| Pedido creado | Usuario (confirmación) y admin (detalle y enlace al panel) |
| Artículo pasa a En tránsito, En almacén, Entrega parcial, Entregado o Cancelado | Usuario |
| Usuario cancela un artículo | Admin |
| Comprobante registrado | Usuario (con monto aplicado y saldo) |
| Restablecer contraseña | Usuario |

Si el admin actualiza varios artículos del mismo pedido en una sola acción, envía **un solo correo agrupado**. En desarrollo, incluye **Mailpit** para ver los correos.

## 9. Archivos y comprobantes

Valida el tipo real por contenido (magic bytes), no solo por extensión. Guarda con nombre aleatorio en el volumen `uploads`. Sírvelos únicamente mediante una ruta autenticada que compruebe que el solicitante es el admin o el dueño del comprobante. Nunca por una URL pública estática.

## 10. WhatsApp

Sin API oficial. Crea `src/lib/whatsapp.ts` con `buildWhatsAppLink(phone, message)` que genere enlaces `https://wa.me/<número>?text=<mensaje codificado>`, y define una interfaz `WhatsAppProvider` para poder conectar la API oficial en el futuro sin tocar la UI.

- **Usuario**: botón flotante de contacto con el negocio y botón "Continuar por WhatsApp" al terminar un pedido.
- **Admin**: botón de WhatsApp en cada usuario (listado y ficha), en cada artículo del panel de artículos y en las acciones en lote, siempre con el mensaje prellenado y el teléfono que el usuario dio al registrarse.
- **Plantillas de mensaje** editables por el admin en Configuración (`MessageTemplate`), con las variables `{nombre}`, `{pedido}`, `{producto}`, `{estado}` y `{saldo}`. Incluir de inicio: artículo llegó a almacén, listo para entrega, recordatorio de saldo pendiente y aviso general de ofertas o novedades.
- **Bitácora de contactos**: cada clic en un botón de WhatsApp del admin se registra en `WhatsAppContactLog` (usuario, admin, mensaje, fecha). Indica que se abrió el chat; WhatsApp no confirma el envío.
- El helper normaliza el teléfono (solo dígitos, con código de país, sin `+`) antes de armar el enlace.

## 11. Diseño visual

**Dirección:** minimalista y moderna, en **rosa y blanco**. Mucho aire, jerarquía clara, cero ruido.

- **Paleta base** (definir como variables CSS y tokens de Tailwind):
  - Blanco `#FFFFFF`
  - Merengue `#FFF6F9` (fondo de página y superficies suaves)
  - Algodón `#FFE3EC` (fondos de énfasis)
  - Fresa `#D12F6A` (acción principal; hover `#B82458`). Cumple contraste AA con texto blanco.
  - Chicle `#F27BA3` (solo detalles decorativos, nunca texto)
  - Tinta `#2A1720` (texto), gris rosado `#7B6470` (texto secundario), borde `#F4D9E3`
- **Tipografía:** *Bricolage Grotesque* para el logotipo y los títulos, *Figtree* para el texto y la interfaz, cargadas con `next/font` (autoalojadas). Una escala tipográfica clara, líneas de menos de 80 caracteres.
- **Elemento distintivo:** una **barra de progreso segmentada por artículo** (Pendiente, En tránsito, En almacén, Entregado) en tonos rosa, que se muestra en el pedido del usuario y en el panel. Es la única pieza con personalidad; todo lo demás va discreto.
- **Chips de estado** (fondo y texto, con contraste AA): Pendiente `#F3EEF1`/`#6B5A63`, En tránsito `#FFF1D6`/`#8A5A00`, En almacén `#EDE7FF`/`#5B3FC4`, Entrega parcial `#FFE3EC`/`#A81F58`, Entregado `#DFF5E7`/`#1D6B3F`, Cancelado `#FBE4E4`/`#A32626`. Pago: Sin pago (neutro), Pago parcial (ámbar), Pagado (verde).
- **Forma y superficie:** radios distintos según jerarquía (20 px en imágenes de producto y modales, 12 px en campos y botones, píldora en chips). Separa con espacio en blanco y bordes finos rosados, sin sombras grises pesadas, sin degradados decorativos y sin tarjetas idénticas repetidas por todos lados.
- **Logotipo:** wordmark "Rainbow Cake GO" con un pequeño ícono SVG de rebanada de pastel en capas. Genera favicon y los íconos de la PWA.
- **Móvil primero:** barra de navegación inferior para el usuario (Catálogo, Carrito, Mis pedidos, Perfil), áreas táctiles de al menos 44 px, tablas del admin convertidas en listas.
- **Texto de interfaz:** en español, sentido de oración, sin MAYÚSCULAS sostenidas, sin flechas en los botones. Los botones nombran la acción exacta ("Guardar cambios", "Enviar pedido"), y los avisos repiten ese verbo ("Cambios guardados"). Los errores dicen qué pasó y cómo corregirlo; los estados vacíos invitan a actuar.
- **Calidad mínima:** foco visible con teclado, respeto de `prefers-reduced-motion`, esqueletos de carga y movimiento solo como respuesta a acciones del usuario.

## 12. Seguridad

- Limitación de intentos en login, registro y recuperación de contraseña.
- Validación con zod en servidor para toda entrada, y consultas solo mediante Prisma.
- Cabeceras de seguridad (CSP, X-Frame-Options, Referrer-Policy, HSTS cuando haya HTTPS) y cookies `Secure` en producción.
- Sin secretos en el repositorio: solo `.env.example`. No registrar datos personales en los logs.
- El primer admin se crea con un script de seed que lee `ADMIN_SEED_EMAIL` y `ADMIN_SEED_PASSWORD` del entorno; **sin contraseñas por defecto** y con cambio de contraseña obligatorio en el primer acceso.
- Contenedores sin usuario root y base de datos sin exposición pública.
- Los teléfonos son datos personales: solo los ven el propio usuario y el admin, y no aparecen en los logs de la aplicación.

## 13. Docker y despliegue (Ubuntu Server)

El servidor ya tiene otras apps, así que **evita los puertos comunes** (80, 443, 3000, 5432, 8080, etc.). Todos los puertos deben venir de variables de `.env` con estos valores por defecto:

| Servicio | Puerto en el host | Puerto en el contenedor |
|---|---|---|
| App | `APP_HOST_PORT=18473` | 3000 |
| PostgreSQL (solo depuración, enlazado a `127.0.0.1`) | `DB_HOST_PORT=15439` | 5432 |
| Mailpit web (solo desarrollo) | `MAILPIT_UI_PORT=18025` | 8025 |
| Mailpit SMTP (solo desarrollo) | `MAILPIT_SMTP_PORT=11025` | 1025 |

Entregables de despliegue:

- `Dockerfile` multi-etapa (dependencias, build, runner mínimo, usuario no root) y `.dockerignore`.
- `docker-compose.yml` con los servicios `app`, `db` y un servicio de un solo uso `migrate` que corre `prisma migrate deploy`. Perfil `dev` para Mailpit. En producción, la base de datos **no publica puertos** y solo se comunica con la app por una red interna.
- Prefijo `rcg_` en nombres de contenedores, red y volúmenes (`rcg_pgdata`, `rcg_uploads`). `restart: unless-stopped` y `healthcheck` en `app` y `db`.
- `scripts/check-ports.sh` que verifique con `ss -ltn` que los puertos configurados están libres antes de levantar los contenedores, y avise cuál está ocupado.
- `Makefile` con `up`, `down`, `logs`, `migrate`, `seed`, `backup` y `restore`. Script de respaldo con `pg_dump` más copia del volumen `uploads`, con ejemplo de cron.
- Preparada para funcionar **detrás de un reverse proxy** (Nginx, Caddy o Traefik) con `APP_URL` y confianza en cabeceras de proxy configurables.
- `.env.example` documentado con: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAILS`, `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, `ADMIN_SEED_NAME`, `WHATSAPP_BUSINESS_NUMBER`, `UPLOAD_DIR`, `MAX_UPLOAD_MB`, `REQUIRE_EMAIL_VERIFICATION`, `TZ` (por defecto `America/Mexico_City`), `CURRENCY` (por defecto `MXN`), `LOCALE` (por defecto `es-MX`), `DEFAULT_PHONE_COUNTRY` (por defecto `MX`) y los puertos anteriores.

## 14. Fases de trabajo

1. **Base**: repositorio, Prisma, Docker Compose, seed del admin y sistema de diseño (tokens, tipografía, componentes base, logotipo).
2. **Autenticación**: registro (con teléfono de WhatsApp obligatorio y validado), login, recuperación de contraseña, roles y middleware.
3. **Catálogo admin**: categorías y productos con imágenes y ofertas.
4. **Catálogo y pedidos del usuario**: catálogo, carrito, creación de pedidos y "Mis pedidos".
5. **Panel de artículos**: vista principal con filtros, cambio de estado, entregas parciales, cancelaciones y bitácora.
6. **Correos**: outbox, plantillas, agrupación y eventos de la sección 8.
7. **Comprobantes y saldos**: carga, asignación a artículos, estados de pago y ficha de usuario.
8. **WhatsApp** (botones, plantillas, bitácora de contactos y difusión asistida), **PWA, exportación CSV y actividad**.
9. **Pulido**: pruebas, accesibilidad, revisión de seguridad y documentación.

## 15. Entregables y criterios de aceptación

Incluye `README.md` (instalación local, variables, puertos, despliegue en Ubuntu, respaldos), `docs/DECISIONS.md` y **datos de demostración** (3 categorías, unos 12 productos, 3 usuarios y pedidos en estados variados con comprobantes parciales).

La app está terminada cuando:

- [ ] Un usuario se registra, hace un pedido con varios artículos y ve cada uno con su estado.
- [ ] El admin cambia estados **por artículo**, registra una entrega parcial y el usuario ve "2 de 3 entregadas".
- [ ] El admin filtra artículos por usuario y por estado (por ejemplo, "En almacén" sin entregar) y exporta el resultado.
- [ ] Un comprobante se adjunta a dos artículos de un usuario, y luego otro comprobante cubre el saldo de uno de ellos; los estados de pago y saldos son correctos.
- [ ] Llegan los correos de la sección 8 al admin y al usuario (verificado en Mailpit) y los fallidos se pueden reenviar.
- [ ] El registro exige un teléfono válido y lo guarda en formato E.164; sin él no se crea la cuenta.
- [ ] El admin ve el listado de usuarios con su teléfono, lo busca por nombre o número y abre WhatsApp con un mensaje prellenado desde el listado, la ficha y el panel de artículos.
- [ ] La difusión asistida genera un botón de WhatsApp por cada usuario seleccionado y registra los contactos en la bitácora.
- [ ] Los enlaces de WhatsApp del lado del usuario abren con el mensaje prellenado.
- [ ] Un usuario no puede ver pedidos ni comprobantes de otro, ni siquiera adivinando URLs.
- [ ] `docker compose up` levanta todo con los puertos de `.env`, y `scripts/check-ports.sh` avisa si alguno está ocupado.
- [ ] La interfaz cumple la sección 11 y se usa cómodamente en un teléfono.
- [ ] Las pruebas de la lógica de dominio (sección 5) y los flujos críticos de Playwright pasan.

</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-09-27T22:28:29-06:00.
</ADDITIONAL_METADATA>
<USER_SETTINGS_CHANGE>
The user changed setting `Model Selection` from None to Claude Opus 4.6 (Thinking). No need to comment on this change if the user doesn't ask about it. If reporting what model you are, please use a human readable name instead of the exact string.
</USER_SETTINGS_CHANGE>
