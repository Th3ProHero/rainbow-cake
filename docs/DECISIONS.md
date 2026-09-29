# Decisiones de Implementación

Registro de decisiones técnicas tomadas durante el desarrollo de Rainbow Cake GO. Cuando el prompt no define algo con claridad, se elige la opción más simple y razonable y se documenta aquí.

---

## D-001: Hashing de contraseñas — bcrypt en lugar de argon2id

**Fecha:** 2024-09-28
**Contexto:** El prompt permite bcrypt con costo ≥ 12 como alternativa a argon2id.
**Decisión:** Usar `bcrypt` con costo 12.
**Razón:** argon2id (`argon2` en npm) requiere compilación nativa con node-gyp, lo cual complica la imagen Docker Alpine. bcrypt tiene binarios precompilados y es ampliamente soportado. Costo 12 proporciona seguridad adecuada para la escala de la aplicación.

---

## D-002: Sesiones — JWT en cookie httpOnly

**Fecha:** 2024-09-28
**Contexto:** El prompt pide "sesión en cookie httpOnly". Hay dos opciones: tabla de sesiones en BD o JWT firmado.
**Decisión:** JWT firmado con `jose` almacenado en cookie `httpOnly`, `SameSite=Lax`, `Secure` en producción.
**Razón:** Evita consultas a la BD en cada request. Para single-instance sin necesidad de revocación inmediata, es la opción más simple. El JWT contiene solo `userId`, `role`, `mustChangePassword` y `exp`.

---

## D-003: Rate limiting — In-memory con Map

**Fecha:** 2024-09-28
**Contexto:** Se necesita limitar intentos en login, registro y recuperación.
**Decisión:** Sliding window en memoria usando `Map<string, number[]>` con limpieza periódica.
**Razón:** La app corre en un solo contenedor. No justifica añadir Redis para un rate limiter. Se pierde al reiniciar, lo cual es aceptable.

---

## D-004: Cola de correos — Polling de tabla EmailOutbox

**Fecha:** 2024-09-28
**Contexto:** Sin Redis. Se necesita una cola con reintentos.
**Decisión:** Tabla `EmailOutbox` con polling cada 10 segundos desde un endpoint interno o worker.
**Razón:** Cumple el requisito de cola con reintentos sin dependencias externas. El worker puede correr como cron interno de Next.js o como proceso separado.

---

## D-005: Código de pedido — Modelo auxiliar con autoincrement

**Fecha:** 2024-09-28
**Contexto:** Se necesita un código secuencial `RCG-XXXXXX`.
**Decisión:** Modelo `OrderCodeSequence` con `@default(autoincrement())`. Al crear un pedido, se inserta un registro para obtener el siguiente número y se formatea como `RCG-{padded}`.
**Razón:** Más portable que una secuencia SQL cruda y funciona con Prisma sin migraciones SQL adicionales.

---

## D-006: Subida de archivos — formData en Server Actions

**Fecha:** 2024-09-28
**Contexto:** Next.js App Router soporta FormData en Server Actions.
**Decisión:** Usar Server Actions con `FormData` para recibir archivos. Validar tipo real con `file-type` (magic bytes).
**Razón:** Evita la complejidad de un Route Handler con busboy/formidable. Next.js maneja el multipart parsing internamente.

---

## D-007: Fuentes — next/font/local con fallback a Google Fonts CDN

**Fecha:** 2024-09-28
**Contexto:** El prompt pide fuentes autoalojadas.
**Decisión:** Descargar los archivos .woff2 de Bricolage Grotesque y Figtree y cargarlos con `next/font/local`. Si los archivos no están disponibles, usar `next/font/google` como fallback temporal.
**Razón:** El autoalojamiento evita dependencia de CDN externo y mejora el rendimiento. Los archivos .woff2 se guardan en `src/fonts/`.

---

## D-008: Email case-insensitivity — Normalización en aplicación

**Fecha:** 2024-09-28
**Contexto:** Prisma no soporta `citext` de PostgreSQL de forma nativa.
**Decisión:** Normalizar todos los emails a lowercase con `.toLowerCase().trim()` antes de guardar y buscar.
**Razón:** Más simple que usar `citext` via raw SQL. El índice unique sobre el campo normalizado garantiza unicidad.

---

## D-009: Tailwind CSS v4 — Uso de @theme en lugar de tailwind.config

**Fecha:** 2024-09-28
**Contexto:** El proyecto se inicializó con Tailwind CSS v4 que usa la directiva `@theme` en CSS en lugar de `tailwind.config.ts`.
**Decisión:** Definir todos los tokens de diseño con `@theme` dentro de `globals.css`.
**Razón:** Es el mecanismo nativo de Tailwind v4. No se necesita `tailwind.config.ts` para los tokens.

---

## D-010: Cancelación por el cliente restringida a PENDING

**Fecha:** 2026-09-28
**Contexto:** Un cliente puede querer cancelar un artículo tras realizar su pedido.
**Decisión:** Permitir la cancelación directa únicamente mientras el artículo esté en estado `PENDING`. Si está en tránsito o almacén, se le pide coordinar vía WhatsApp. Los abonos ya registrados pasan automáticamente a saldo a favor.
**Razón:** Evita incongruencias con pedidos que ya fueron enviados o importados por el administrador.

---

## D-011: Gestión de artículos a nivel OrderItem

**Fecha:** 2026-09-28
**Contexto:** Los pedidos tienen múltiples artículos que se coordinan o importan a diferentes tiempos.
**Decisión:** La consola del administrador (`/admin/items`) opera a nivel de filas `OrderItem`, con soporte para entregas parciales (`deliveredDelta`) y consolidación de notificaciones por email cuando se actualiza en lote.
**Razón:** Refleja la realidad operativa del negocio de merch manual.

---

## D-012: Asignación de comprobantes N:M con PaymentAllocation

**Fecha:** 2026-09-28
**Contexto:** Un cliente puede transferir un monto global que cubre varios artículos de diferentes pedidos, o pagar un solo artículo en varios abonos.
**Decisión:** Modelo `PaymentAllocation` con validación de que la suma de asignaciones no supere el monto del comprobante, y ruta protegida `/api/files/payments/...` restringida a admin o al usuario dueño.
**Razón:** Máxima flexibilidad para coordinar pagos manuales sin pagos en línea.

---

## D-013: Difusión asistida por WhatsApp y bitácora

**Fecha:** 2026-09-28
**Contexto:** Se requiere contactar clientes por WhatsApp sin incurrir en costos de API de WhatsApp Business.
**Decisión:** Enlaces wa.me con plantillas parametrizadas (`{nombre}`, `{pedido}`, `{producto}`, `{estado}`, `{saldo}`) y registro en `WhatsAppContactLog`.
**Razón:** Costo cero, control directo desde el navegador o celular del administrador.

---

## D-014: Productos sombra para GroupOrderItem

**Fecha:** 2026-09-28
**Contexto:** Los pedidos grupales requieren seguimiento de artículos con pagos, entregas parciales y comprobantes sin alterar el catálogo público.
**Decisión:** Cada `GroupOrderItem` cuenta con un `Product` asociado (`isGroupItem: true`, `status: HIDDEN`, SKU `GP-XXXX-YY`).
**Razón:** Permite que las asignaciones a clientes sean filas `OrderItem` estándar con relaciones completas, aprovechando toda la arquitectura existente sin duplicar lógica de negocio.

---

## D-015: Secuencia secuencial de código de grupo GP-XXXX

**Fecha:** 2026-09-28
**Contexto:** Se necesita un identificador legible y único para cada pedido grupal.
**Decisión:** Modelo auxiliar `GroupOrderCodeSequence` con `@default(autoincrement())` para generar códigos secuenciales como `GP-0001`, `GP-0002`.
**Razón:** Consistencia con `D-005` (`OrderCodeSequence`) y máxima portabilidad entre motores de base de datos.

---

## D-016: Reutilización de una única Order por usuario por pedido grupal

**Fecha:** 2026-09-28
**Contexto:** Un cliente puede pedir múltiples artículos en momentos diferentes dentro del mismo pedido grupal.
**Decisión:** Reutilizar la orden existente si el cliente ya tiene una asociada a ese `groupOrderId`, o crear una nueva si es su primer artículo en dicho grupo.
**Razón:** El usuario visualiza un único pedido consolidado por cada compra colectiva en su panel de "Mis pedidos".

---

## D-017: Algoritmo de prorrateo exacto con absorción de centavos

**Fecha:** 2026-09-28
**Contexto:** La división de costos adicionales (EMS, aduanas, cruces) entre varias líneas produce residuos de fracciones de centavo.
**Decisión:** Redondear cada línea a 2 decimales y forzar que la última línea activa no manual absorba la diferencia exacta (`totalCost - suma_anteriores`).
**Razón:** Garantiza que la suma de todos los cargos imputados a las líneas coincida idénticamente con el total de costos capturado por el administrador.

---

## D-018: Recálculo de costos y protección de cargos manuales

**Fecha:** 2026-09-28
**Contexto:** Al agregar o editar líneas tras aplicar costos adicionales, los montos pueden desactualizarse.
**Decisión:** Agregar `additionalChargeManual: Boolean` en `OrderItem`. El recálculo preserva las líneas con cargo manual, deduciendo su importe del total a prorratear entre las líneas restantes.
**Razón:** Flexibilidad operativa sin pérdida accidental de ajustes particulares hechos por el administrador.

---

## D-019: Marca y presentación: "Compra en grupo GO" vs "Pedidos grupales"

**Fecha:** 2026-09-28
**Contexto:** Diferenciar la experiencia de usuario de la terminología administrativa.
**Decisión:** Usar "Compra en grupo GO" en la interfaz de clientes, correos y plantillas de WhatsApp, y mantener "Pedidos grupales" en la consola de administración. Centralizar ambos textos en `src/lib/constants.ts`.
**Razón:** Claridad comercial para el cliente y rigor funcional para el administrador.

---

## D-020: Protección multinivel de artículos de pedidos grupales

**Fecha:** 2026-09-28
**Contexto:** Los artículos de pedidos grupales no deben ser descubiertos ni adquiridos fuera del flujo de compra grupal.
**Decisión:** Excluir `isGroupItem: true` en el catálogo, buscador, endpoint de detalle de producto (404 para usuarios comunes) y validación en la acción de checkout/creación de pedidos convencionales.
**Razón:** Defensa en profundidad: la ocultación en interfaz se respalda con rechazo explícito a nivel de servidor.

---

## D-021: Publicación de stock en catálogo

**Fecha:** 2026-09-28
**Contexto:** Las piezas sobrantes de un pedido grupal pueden venderse al público en el catálogo general.
**Decisión:** Al publicar stock, se actualiza el producto vinculado con `stock = stockQty`, `availability = IN_STOCK`, `status = ACTIVE` e `isGroupItem = false`, guardando `publishedAt` y `publishedQty` en `GroupOrderItem` sin alterar la lista histórica de compra.
**Razón:** Convierte el sobrante en un producto regular de catálogo sin romper el historial de la compra colectiva.

---

## D-022: Manejo de artículo "No conseguido"

**Fecha:** 2026-09-28
**Contexto:** Un proveedor puede reportar que un artículo no está disponible tras cerrar la compra.
**Decisión:** Marcar `notSecured = true` cancela las piezas pendientes de entrega de todas sus líneas, registra el evento en bitácora y refleja automáticamente el saldo a favor para reembolsos manuales. Desmarcar `notSecured` no reactiva automáticamente líneas ya canceladas.
**Razón:** Integridad del flujo contable sin reactivaciones accidentales.
