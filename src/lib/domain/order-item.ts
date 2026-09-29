/**
 * Domain logic for order item status transitions, deliveries, and cancellations.
 * Pure functions — no side effects, no database access.
 */

import type { OrderItemStatus } from "@prisma/client";

interface OrderItemData {
  quantity: number;
  quantityDelivered: number;
  quantityCancelled: number;
  status: OrderItemStatus;
}

interface DeliveryResult {
  quantityDelivered: number;
  quantityCancelled: number;
  status: OrderItemStatus;
  error?: string;
}

/**
 * Calculate the maximum deliverable quantity for an item.
 */
export function maxDeliverable(item: OrderItemData): number {
  return item.quantity - item.quantityCancelled - item.quantityDelivered;
}

/**
 * Apply a delivery to an order item.
 * Returns the new state or an error.
 *
 * Rule: quantityDelivered never exceeds quantity - quantityCancelled.
 * If 0 < delivered < total → PARTIALLY_DELIVERED
 * If delivered == total → DELIVERED
 */
export function applyDelivery(
  item: OrderItemData,
  deliverQty: number
): DeliveryResult {
  if (deliverQty <= 0) {
    return { ...item, error: "La cantidad a entregar debe ser mayor a 0" };
  }

  const max = maxDeliverable(item);
  if (deliverQty > max) {
    return {
      ...item,
      error: `Solo se pueden entregar ${max} unidades (de ${item.quantity} pedidas, ${item.quantityDelivered} ya entregadas, ${item.quantityCancelled} canceladas)`,
    };
  }

  const newDelivered = item.quantityDelivered + deliverQty;
  const effectiveTotal = item.quantity - item.quantityCancelled;

  let newStatus: OrderItemStatus;
  if (newDelivered >= effectiveTotal) {
    newStatus = "DELIVERED";
  } else if (newDelivered > 0) {
    newStatus = "PARTIALLY_DELIVERED";
  } else {
    newStatus = item.status;
  }

  return {
    quantityDelivered: newDelivered,
    quantityCancelled: item.quantityCancelled,
    status: newStatus,
  };
}

/**
 * Cancel an order item.
 * Cancels only the undelivered units: quantityCancelled = quantity - quantityDelivered.
 * If there were partial deliveries, status becomes DELIVERED (with what was delivered).
 * If nothing was delivered, status becomes CANCELLED.
 */
export function applyCancellation(item: OrderItemData): DeliveryResult {
  const newCancelled = item.quantity - item.quantityDelivered;

  let newStatus: OrderItemStatus;
  if (item.quantityDelivered > 0) {
    newStatus = "DELIVERED";
  } else {
    newStatus = "CANCELLED";
  }

  return {
    quantityDelivered: item.quantityDelivered,
    quantityCancelled: newCancelled,
    status: newStatus,
  };
}

/**
 * Check if a user can cancel an item (only while PENDING).
 */
export function canUserCancel(item: OrderItemData): boolean {
  return item.status === "PENDING";
}

/**
 * Validate a status transition.
 * Admin can change any status at any time.
 * Users can only cancel PENDING items.
 */
export function validateStatusTransition(
  _currentStatus: OrderItemStatus,
  _newStatus: OrderItemStatus,
  isAdmin: boolean
): { valid: boolean; error?: string } {
  if (isAdmin) {
    return { valid: true };
  }

  // Users can only cancel, and only from PENDING — handled elsewhere
  return {
    valid: false,
    error: "No tienes permiso para cambiar el estado de este artículo",
  };
}
