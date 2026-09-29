/**
 * Domain logic for order status derivation.
 * Pure functions — no side effects, no database access.
 */

import type { OrderItemStatus } from "@prisma/client";
import type { DerivedOrderStatus } from "@/lib/constants";

interface OrderItemForStatus {
  status: OrderItemStatus;
}

/**
 * Derive the order status from its items.
 * - Open: at least one item is not DELIVERED or CANCELLED
 * - Completed: all items are DELIVERED or CANCELLED, with at least one DELIVERED
 * - Cancelled: all items are CANCELLED
 */
export function deriveOrderStatus(items: OrderItemForStatus[]): DerivedOrderStatus {
  if (items.length === 0) return "OPEN";

  const closedStatuses: OrderItemStatus[] = ["DELIVERED", "CANCELLED"];
  const allClosed = items.every((item) => closedStatuses.includes(item.status));

  if (!allClosed) return "OPEN";

  const hasDelivered = items.some((item) => item.status === "DELIVERED");
  return hasDelivered ? "COMPLETED" : "CANCELLED";
}
