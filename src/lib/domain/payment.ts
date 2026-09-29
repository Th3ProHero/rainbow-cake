/**
 * Domain logic for payments, balances, and payment status.
 * Pure functions — no side effects, no database access.
 */

import type { PaymentStatus } from "@/lib/constants";

interface OrderItemForPayment {
  quantity: number;
  quantityCancelled: number;
  snapshotUnitPrice: number | string;
  additionalCharge?: number | string;
}

interface AllocationForPayment {
  amountApplied: number | string;
}

/**
 * Calculate the amount due for an order item.
 * amountDue = unitPrice × (quantity - quantityCancelled) + additionalCharge × (quantity - quantityCancelled) / quantity
 * If completely cancelled (or quantity <= 0), amountDue = 0.
 */
export function calculateAmountDue(item: OrderItemForPayment): number {
  const price =
    typeof item.snapshotUnitPrice === "string"
      ? parseFloat(item.snapshotUnitPrice)
      : item.snapshotUnitPrice;

  const extra =
    item.additionalCharge !== undefined
      ? typeof item.additionalCharge === "string"
        ? parseFloat(item.additionalCharge)
        : item.additionalCharge
      : 0;

  const effectiveUnits = item.quantity - item.quantityCancelled;
  if (effectiveUnits <= 0 || item.quantity <= 0) {
    return 0;
  }

  const baseDue = price * effectiveUnits;
  const extraDue = (extra * effectiveUnits) / item.quantity;
  return Math.round((baseDue + extraDue) * 100) / 100;
}

/**
 * Calculate the total paid for an order item from its allocations.
 */
export function calculateTotalPaid(allocations: AllocationForPayment[]): number {
  return allocations.reduce((sum, a) => {
    const amount =
      typeof a.amountApplied === "string"
        ? parseFloat(a.amountApplied)
        : a.amountApplied;
    return sum + amount;
  }, 0);
}

/**
 * Calculate the balance (saldo) for an order item.
 * Positive = amount still owed.
 * Negative = credit (saldo a favor), e.g. if a paid item was cancelled.
 */
export function calculateBalance(
  item: OrderItemForPayment,
  allocations: AllocationForPayment[]
): number {
  const due = calculateAmountDue(item);
  const paid = calculateTotalPaid(allocations);
  // Round to 2 decimals to avoid floating point issues
  return Math.round((due - paid) * 100) / 100;
}

/**
 * Derive the payment status for an order item.
 */
export function derivePaymentStatus(
  item: OrderItemForPayment,
  allocations: AllocationForPayment[]
): PaymentStatus {
  const paid = calculateTotalPaid(allocations);
  const due = calculateAmountDue(item);

  if (paid <= 0) return "UNPAID";
  if (paid > due) return "CREDIT"; // overpaid or cancelled after payment
  if (paid === due && due > 0) return "PAID";
  return "PARTIAL";
}
