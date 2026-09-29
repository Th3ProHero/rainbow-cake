/**
 * Domain logic for Group Orders (Pedidos Grupales / Compra en grupo GO).
 * Pure functions — no side effects, no database access.
 */

import type { GroupOrderProrationMethod } from "@/lib/constants";

export interface GroupOrderLineForProration {
  id: string;
  baseAmount: number; // unitPrice * (quantity - quantityCancelled)
  effectivePieces: number; // quantity - quantityCancelled
  currentCharge?: number;
  isManual?: boolean;
}

export interface ProrationResult {
  charges: Record<string, number>; // lineId -> charge
  totalCalculated: number;
  difference: number; // totalCost - totalCalculated (0 when exact)
  isValidManual?: boolean;
}

/**
 * Prorate additional costs (EMS, Aduana, Cruce, etc.) across order item lines.
 *
 * Rules:
 * 1. Round each charge to 2 decimals.
 * 2. If recalculating, lines marked as manual (isManual: true) keep their currentCharge.
 * 3. The last non-manual line absorbs the penny remainder so the sum of charges exactly equals totalCost.
 * 4. For MANUAL method: calculates the sum and checks whether it matches totalCost.
 */
export function prorateAdditionalCosts(
  lines: GroupOrderLineForProration[],
  totalCost: number,
  method: GroupOrderProrationMethod
): ProrationResult {
  const round2 = (val: number) => Math.round(val * 100) / 100;
  const targetCost = round2(totalCost);

  if (lines.length === 0) {
    return {
      charges: {},
      totalCalculated: 0,
      difference: targetCost,
      isValidManual: targetCost === 0,
    };
  }

  // Active lines that can receive prorated charges (effectivePieces > 0)
  const activeLines = lines.filter((l) => l.effectivePieces > 0);
  const inactiveLines = lines.filter((l) => l.effectivePieces <= 0);

  const charges: Record<string, number> = {};
  for (const l of inactiveLines) {
    charges[l.id] = 0;
  }

  if (activeLines.length === 0) {
    return {
      charges,
      totalCalculated: 0,
      difference: targetCost,
      isValidManual: targetCost === 0,
    };
  }

  if (targetCost <= 0) {
    for (const l of activeLines) {
      charges[l.id] = 0;
    }
    return {
      charges,
      totalCalculated: 0,
      difference: 0,
      isValidManual: true,
    };
  }

  // MANUAL Method
  if (method === "MANUAL") {
    let sum = 0;
    for (const l of activeLines) {
      const charge = round2(l.currentCharge ?? 0);
      charges[l.id] = charge;
      sum += charge;
    }
    sum = round2(sum);
    const diff = round2(targetCost - sum);
    return {
      charges,
      totalCalculated: sum,
      difference: diff,
      isValidManual: diff === 0,
    };
  }

  // Separate manual vs non-manual lines
  const manualLines = activeLines.filter((l) => l.isManual);
  const autoLines = activeLines.filter((l) => !l.isManual);

  let manualSum = 0;
  for (const l of manualLines) {
    const charge = round2(l.currentCharge ?? 0);
    charges[l.id] = charge;
    manualSum += charge;
  }
  manualSum = round2(manualSum);

  const remainingCostToDistribute = round2(targetCost - manualSum);

  // If all lines are manual or remaining cost <= 0
  if (autoLines.length === 0) {
    const diff = round2(targetCost - manualSum);
    return {
      charges,
      totalCalculated: manualSum,
      difference: diff,
      isValidManual: diff === 0,
    };
  }

  if (remainingCostToDistribute <= 0) {
    for (const l of autoLines) {
      charges[l.id] = 0;
    }
    return {
      charges,
      totalCalculated: manualSum,
      difference: round2(targetCost - manualSum),
      isValidManual: targetCost === manualSum,
    };
  }

  // Distribution weights
  const totalWeight =
    method === "PIECES"
      ? autoLines.reduce((sum, l) => sum + l.effectivePieces, 0)
      : autoLines.reduce((sum, l) => sum + l.baseAmount, 0);

  if (totalWeight <= 0) {
    // Equal distribution if total weight is 0
    let allocated = 0;
    for (let i = 0; i < autoLines.length - 1; i++) {
      const line = autoLines[i];
      const charge = round2(remainingCostToDistribute / autoLines.length);
      charges[line.id] = charge;
      allocated += charge;
    }
    // Last line absorbs difference
    const lastLine = autoLines[autoLines.length - 1];
    charges[lastLine.id] = round2(remainingCostToDistribute - allocated);
  } else {
    let allocated = 0;
    for (let i = 0; i < autoLines.length - 1; i++) {
      const line = autoLines[i];
      const weight = method === "PIECES" ? line.effectivePieces : line.baseAmount;
      const charge = round2((weight / totalWeight) * remainingCostToDistribute);
      charges[line.id] = charge;
      allocated += charge;
    }
    // Last line absorbs difference so total is exact
    const lastLine = autoLines[autoLines.length - 1];
    const lastCharge = round2(remainingCostToDistribute - allocated);
    charges[lastLine.id] = lastCharge;
  }

  // Final check
  let finalSum = 0;
  for (const l of activeLines) {
    finalSum += charges[l.id] || 0;
  }
  finalSum = round2(finalSum);

  return {
    charges,
    totalCalculated: finalSum,
    difference: round2(targetCost - finalSum),
    isValidManual: true,
  };
}

/**
 * Derived item quantities for a GroupOrderItem:
 * - reservedQty: sum of active units (quantity - quantityCancelled)
 * - toBuyQty: reservedQty + stockQty
 * - shouldBuy: toBuyQty > 0
 */
export function calculateGroupItemTotals(
  reservedQty: number,
  stockQty: number
): {
  reservedQty: number;
  stockQty: number;
  toBuyQty: number;
  shouldBuy: boolean;
} {
  const safeReserved = Math.max(0, reservedQty);
  const safeStock = Math.max(0, stockQty);
  const toBuyQty = safeReserved + safeStock;

  return {
    reservedQty: safeReserved,
    stockQty: safeStock,
    toBuyQty,
    shouldBuy: toBuyQty > 0,
  };
}

/**
 * Suggested retail price for publishing stock pieces to the public catalog:
 * suggestedPrice = basePrice + averageAdditionalChargePerUnit
 */
export function calculateSuggestedRetailPrice(
  basePrice: number,
  averageAdditionalChargePerUnit: number
): number {
  const safeBase = Math.max(0, basePrice);
  const safeAvg = Math.max(0, averageAdditionalChargePerUnit);
  return Math.round((safeBase + safeAvg) * 100) / 100;
}

/**
 * Validate an assignment before creating/updating an OrderItem:
 * - quantity must be > 0
 * - variant is required if the item defines variant options
 */
export function validateGroupOrderAssignment(params: {
  quantity: number;
  variant?: string | null;
  variantOptions?: string[];
}): { valid: boolean; error?: string } {
  if (!params.quantity || params.quantity <= 0) {
    return { valid: false, error: "La cantidad debe ser mayor a 0." };
  }

  const options = params.variantOptions || [];
  if (options.length > 0) {
    const v = params.variant?.trim();
    if (!v) {
      return { valid: false, error: "Debes seleccionar una variante obligatoria." };
    }
    if (!options.includes(v)) {
      return {
        valid: false,
        error: `La variante "${v}" no es válida. Opciones válidas: ${options.join(", ")}`,
      };
    }
  }

  return { valid: true };
}
