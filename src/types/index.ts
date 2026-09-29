/**
 * Shared types and DTOs for Rainbow Cake GO
 */

import type {
  OrderItemStatus,
  ProductAvailability,
  ProductStatus,
  Role,
} from "@prisma/client";

// Re-export Prisma enums for convenience
export type { OrderItemStatus, ProductAvailability, ProductStatus, Role };

// ── Cart ──────────────────────────────────────

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  imagePath?: string | null;
}

export interface Cart {
  items: CartItem[];
}

// ── Order with derived status ─────────────────

export interface OrderWithStatus {
  id: string;
  code: string;
  note?: string | null;
  createdAt: Date;
  derivedStatus: "OPEN" | "COMPLETED" | "CANCELLED";
  items: OrderItemWithPayment[];
}

export interface OrderItemWithPayment {
  id: string;
  snapshotName: string;
  snapshotSku: string;
  snapshotUnitPrice: number;
  quantity: number;
  quantityDelivered: number;
  quantityCancelled: number;
  status: OrderItemStatus;
  amountDue: number;
  totalPaid: number;
  balance: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID" | "CREDIT";
}

// ── Admin item filters ────────────────────────

export interface ItemFilters {
  search?: string;
  userId?: string;
  status?: OrderItemStatus;
  paymentStatus?: "UNPAID" | "PARTIAL" | "PAID";
  categoryId?: string;
  productId?: string;
  dateFrom?: string;
  dateTo?: string;
  groupByUser?: boolean;
}

// ── Product for catalog ───────────────────────

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  price: number;
  offerPrice?: number | null;
  isOfferActive: boolean;
  discountPercent?: number | null;
  availability: ProductAvailability;
  status: ProductStatus;
  releaseDate?: Date | null;
  imagePath?: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  merchType?: string | null;
}

// ── Session ───────────────────────────────────

export interface SessionPayload {
  userId: string;
  role: Role;
  mustChangePassword: boolean;
  exp: number;
}
