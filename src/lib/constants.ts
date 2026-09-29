import { OrderItemStatus } from "@prisma/client";

// ── Status labels in Spanish ──────────────────

export const ORDER_ITEM_STATUS_LABELS: Record<OrderItemStatus, string> = {
  PENDING: "Pendiente",
  IN_TRANSIT: "En tránsito",
  IN_WAREHOUSE: "En almacén",
  PARTIALLY_DELIVERED: "Entrega parcial",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const AVAILABILITY_LABELS = {
  IN_STOCK: "Disponible",
  ON_DEMAND: "Bajo pedido",
  OUT_OF_STOCK: "Agotado",
} as const;

export const PRODUCT_AVAILABILITY_LABELS: Record<string, string> = AVAILABILITY_LABELS;

export const PRODUCT_STATUS_LABELS = {
  ACTIVE: "Activo",
  HIDDEN: "Oculto",
} as const;

export const PAYMENT_STATUS_LABELS = {
  UNPAID: "Sin pago",
  PARTIAL: "Pago parcial",
  PAID: "Pagado",
  CREDIT: "Saldo a favor",
} as const;

// ── Derived order status ──────────────────────

export type DerivedOrderStatus = "OPEN" | "COMPLETED" | "CANCELLED";

export const DERIVED_ORDER_STATUS_LABELS: Record<DerivedOrderStatus, string> = {
  OPEN: "Abierto",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

// ── Payment status type ───────────────────────

export type PaymentStatus = "UNPAID" | "PARTIAL" | "PAID" | "CREDIT";

// ── Progress bar order ────────────────────────

export const STATUS_PROGRESS_ORDER: OrderItemStatus[] = [
  "PENDING",
  "IN_TRANSIT",
  "IN_WAREHOUSE",
  "DELIVERED",
];

// ── Status colors for CSS classes ─────────────

export const STATUS_COLORS: Record<OrderItemStatus, { bg: string; fg: string }> = {
  PENDING: { bg: "bg-status-pending-bg", fg: "text-status-pending-fg" },
  IN_TRANSIT: { bg: "bg-status-transit-bg", fg: "text-status-transit-fg" },
  IN_WAREHOUSE: { bg: "bg-status-warehouse-bg", fg: "text-status-warehouse-fg" },
  PARTIALLY_DELIVERED: { bg: "bg-status-partial-bg", fg: "text-status-partial-fg" },
  DELIVERED: { bg: "bg-status-delivered-bg", fg: "text-status-delivered-fg" },
  CANCELLED: { bg: "bg-status-cancelled-bg", fg: "text-status-cancelled-fg" },
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, { bg: string; fg: string }> = {
  UNPAID: { bg: "bg-payment-none-bg", fg: "text-payment-none-fg" },
  PARTIAL: { bg: "bg-payment-partial-bg", fg: "text-payment-partial-fg" },
  PAID: { bg: "bg-payment-paid-bg", fg: "text-payment-paid-fg" },
  CREDIT: { bg: "bg-payment-paid-bg", fg: "text-payment-paid-fg" },
};

// ── Allowed file types ────────────────────────

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_PAYMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_UPLOAD_BYTES = (parseInt(process.env.MAX_UPLOAD_MB || "10") || 10) * 1024 * 1024;

// ── Default merch type suggestions ────────────

export const MERCH_TYPE_SUGGESTIONS = [
  "Playera",
  "Sudadera",
  "Gorra",
  "Taza",
  "Sticker",
  "Póster",
  "Pin",
  "Llavero",
  "Bolsa",
  "Figura",
  "Álbum",
  "Photocard",
  "Lightstick",
  "Otro",
] as const;

// ── Group Orders (Pedidos Grupales / Compra en grupo GO) ──

export const GROUP_ORDER_USER_LABEL = "Compra en grupo GO";
export const GROUP_ORDER_ADMIN_LABEL = "Pedidos grupales";

export type GroupOrderStatus =
  | "OPEN"
  | "CLOSED"
  | "PURCHASED"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "COMPLETED"
  | "CANCELLED";

export const GROUP_ORDER_STATUS_LABELS: Record<GroupOrderStatus, string> = {
  OPEN: "Abierto",
  CLOSED: "Cerrado",
  PURCHASED: "Comprado",
  IN_TRANSIT: "En tránsito",
  ARRIVED: "Llegó a almacén",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

export const GROUP_ORDER_STATUS_COLORS: Record<
  GroupOrderStatus,
  { bg: string; fg: string; border: string }
> = {
  OPEN: { bg: "bg-emerald-50", fg: "text-emerald-700", border: "border-emerald-200" },
  CLOSED: { bg: "bg-slate-100", fg: "text-slate-700", border: "border-slate-300" },
  PURCHASED: { bg: "bg-blue-50", fg: "text-blue-700", border: "border-blue-200" },
  IN_TRANSIT: { bg: "bg-sky-50", fg: "text-sky-700", border: "border-sky-200" },
  ARRIVED: { bg: "bg-amber-50", fg: "text-amber-700", border: "border-amber-200" },
  COMPLETED: { bg: "bg-pink-50", fg: "text-strawberry", border: "border-pink-200" },
  CANCELLED: { bg: "bg-rose-50", fg: "text-rose-700", border: "border-rose-200" },
};

export type GroupOrderProrationMethod = "AMOUNT" | "PIECES" | "MANUAL";

export const GROUP_ORDER_PRORATION_LABELS: Record<GroupOrderProrationMethod, string> = {
  AMOUNT: "Proporcional al monto de cada línea",
  PIECES: "Por pieza (igual para cada unidad)",
  MANUAL: "Manual por línea",
};
