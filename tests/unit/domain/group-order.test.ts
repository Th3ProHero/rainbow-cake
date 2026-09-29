import { describe, it, expect } from "vitest";
import {
  prorateAdditionalCosts,
  calculateGroupItemTotals,
  calculateSuggestedRetailPrice,
  validateGroupOrderAssignment,
} from "@/lib/domain/group-order";

describe("Group Order Domain Logic", () => {
  describe("prorateAdditionalCosts", () => {
    it("prorates by AMOUNT and absorbs rounding difference in the last item so sum is exact", () => {
      // 3 items with prices 65, 80, 590. Total base = 735. Total cost = 100
      const lines = [
        { id: "line-1", baseAmount: 65, effectivePieces: 1 },
        { id: "line-2", baseAmount: 80, effectivePieces: 1 },
        { id: "line-3", baseAmount: 590, effectivePieces: 1 },
      ];
      const totalCost = 100;
      const res = prorateAdditionalCosts(lines, totalCost, "AMOUNT");

      // Verify each charge is rounded to 2 decimals
      expect(res.charges["line-1"]).toBe(8.84); // 65/735 * 100 = 8.8435... -> 8.84
      expect(res.charges["line-2"]).toBe(10.88); // 80/735 * 100 = 10.8843... -> 10.88
      // Last line absorbs remainder: 100 - (8.84 + 10.88) = 100 - 19.72 = 80.28
      expect(res.charges["line-3"]).toBe(80.28);

      // Total must be exactly 100
      const totalSum =
        res.charges["line-1"] + res.charges["line-2"] + res.charges["line-3"];
      expect(totalSum).toBe(100);
      expect(res.totalCalculated).toBe(100);
      expect(res.difference).toBe(0);
      expect(res.isValidManual).toBe(true);
    });

    it("prorates by PIECES equally across units and absorbs rounding difference", () => {
      // 3 lines with 1, 1, 1 pieces. Total cost = 100.
      const lines = [
        { id: "line-1", baseAmount: 65, effectivePieces: 1 },
        { id: "line-2", baseAmount: 80, effectivePieces: 1 },
        { id: "line-3", baseAmount: 590, effectivePieces: 1 },
      ];
      const res = prorateAdditionalCosts(lines, 100, "PIECES");

      expect(res.charges["line-1"]).toBe(33.33);
      expect(res.charges["line-2"]).toBe(33.33);
      expect(res.charges["line-3"]).toBe(33.34); // Absorbed remainder

      const sum =
        res.charges["line-1"] + res.charges["line-2"] + res.charges["line-3"];
      expect(sum).toBe(100);
      expect(res.difference).toBe(0);
    });

    it("respects manual lines when recalculating and prorates the remainder across non-manual lines", () => {
      // Line 1 is manual at $30. Total cost is $100. Remaining $70 should be prorated between line 2 and line 3.
      const lines = [
        { id: "line-1", baseAmount: 100, effectivePieces: 1, isManual: true, currentCharge: 30 },
        { id: "line-2", baseAmount: 100, effectivePieces: 1, isManual: false },
        { id: "line-3", baseAmount: 100, effectivePieces: 1, isManual: false },
      ];
      const res = prorateAdditionalCosts(lines, 100, "PIECES");

      expect(res.charges["line-1"]).toBe(30);
      expect(res.charges["line-2"]).toBe(35);
      expect(res.charges["line-3"]).toBe(35);
      expect(res.totalCalculated).toBe(100);
      expect(res.difference).toBe(0);
    });

    it("evaluates MANUAL method correctly and detects differences", () => {
      const lines = [
        { id: "line-1", baseAmount: 100, effectivePieces: 1, currentCharge: 50 },
        { id: "line-2", baseAmount: 100, effectivePieces: 1, currentCharge: 40 },
      ];
      // Target is 100, but sum is 90
      const res = prorateAdditionalCosts(lines, 100, "MANUAL");
      expect(res.totalCalculated).toBe(90);
      expect(res.difference).toBe(10);
      expect(res.isValidManual).toBe(false);

      // Target matches sum
      const resMatch = prorateAdditionalCosts(lines, 90, "MANUAL");
      expect(resMatch.totalCalculated).toBe(90);
      expect(resMatch.difference).toBe(0);
      expect(resMatch.isValidManual).toBe(true);
    });

    it("assigns 0 to inactive lines (effectivePieces <= 0)", () => {
      const lines = [
        { id: "line-active", baseAmount: 100, effectivePieces: 1 },
        { id: "line-cancelled", baseAmount: 100, effectivePieces: 0 },
      ];
      const res = prorateAdditionalCosts(lines, 50, "AMOUNT");
      expect(res.charges["line-cancelled"]).toBe(0);
      expect(res.charges["line-active"]).toBe(50);
      expect(res.totalCalculated).toBe(50);
    });
  });

  describe("calculateGroupItemTotals", () => {
    it("calculates reservedQty, stockQty, toBuyQty and shouldBuy flag", () => {
      // 5 reserved + 2 stock = 7 to buy -> shouldBuy = true
      const res1 = calculateGroupItemTotals(5, 2);
      expect(res1.reservedQty).toBe(5);
      expect(res1.stockQty).toBe(2);
      expect(res1.toBuyQty).toBe(7);
      expect(res1.shouldBuy).toBe(true);

      // 0 reserved + 0 stock = 0 to buy -> shouldBuy = false
      const res2 = calculateGroupItemTotals(0, 0);
      expect(res2.toBuyQty).toBe(0);
      expect(res2.shouldBuy).toBe(false);

      // 0 reserved + 3 stock = 3 to buy -> shouldBuy = true
      const res3 = calculateGroupItemTotals(0, 3);
      expect(res3.toBuyQty).toBe(3);
      expect(res3.shouldBuy).toBe(true);
    });
  });

  describe("calculateSuggestedRetailPrice", () => {
    it("sums base price and average additional charge per piece", () => {
      // Base: $590, average extra: $48.50 -> $638.50
      expect(calculateSuggestedRetailPrice(590, 48.5)).toBe(638.5);
    });
  });

  describe("validateGroupOrderAssignment", () => {
    it("fails when quantity <= 0", () => {
      expect(validateGroupOrderAssignment({ quantity: 0 }).valid).toBe(false);
      expect(validateGroupOrderAssignment({ quantity: -1 }).valid).toBe(false);
    });

    it("requires variant if options are specified", () => {
      const options = ["Onew", "Key", "Minho", "Taemin"];
      const missing = validateGroupOrderAssignment({
        quantity: 1,
        variantOptions: options,
        variant: "",
      });
      expect(missing.valid).toBe(false);
      expect(missing.error).toContain("variante obligatoria");

      const invalid = validateGroupOrderAssignment({
        quantity: 1,
        variantOptions: options,
        variant: "InvalidMember",
      });
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toContain("no es válida");

      const valid = validateGroupOrderAssignment({
        quantity: 1,
        variantOptions: options,
        variant: "Key",
      });
      expect(valid.valid).toBe(true);
    });

    it("accepts items with no variants", () => {
      expect(
        validateGroupOrderAssignment({
          quantity: 2,
          variantOptions: [],
        }).valid
      ).toBe(true);
    });
  });
});
