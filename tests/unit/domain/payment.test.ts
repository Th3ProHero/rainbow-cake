import { describe, it, expect } from "vitest";
import {
  calculateAmountDue,
  calculateTotalPaid,
  calculateBalance,
  derivePaymentStatus,
} from "@/lib/domain/payment";

describe("Payment Domain Logic", () => {
  const item = {
    quantity: 4,
    quantityCancelled: 1,
    snapshotUnitPrice: "250.00",
  };

  it("calculates amount due based on effective non-cancelled units", () => {
    // 3 effective * 250 = 750
    expect(calculateAmountDue(item)).toBe(750);
  });

  it("calculates amount due with additional charge proportionally", () => {
    // 2 total, 0 cancelled, 590 unitPrice, 96 additionalCharge -> 590*2 + 96*2/2 = 1276
    expect(
      calculateAmountDue({
        quantity: 2,
        quantityCancelled: 0,
        snapshotUnitPrice: 590,
        additionalCharge: 96,
      })
    ).toBe(1276);

    // 2 total, 1 cancelled, 590 unitPrice, 96 additionalCharge -> 590*1 + 96*1/2 = 638
    expect(
      calculateAmountDue({
        quantity: 2,
        quantityCancelled: 1,
        snapshotUnitPrice: 590,
        additionalCharge: 96,
      })
    ).toBe(638);
  });

  it("calculates amount due as 0 when completely cancelled even with additional charge", () => {
    expect(
      calculateAmountDue({
        quantity: 2,
        quantityCancelled: 2,
        snapshotUnitPrice: 590,
        additionalCharge: 96,
      })
    ).toBe(0);
  });

  it("calculates total paid from allocations", () => {
    const allocations = [
      { amountApplied: "250.00" },
      { amountApplied: 100.5 },
    ];
    expect(calculateTotalPaid(allocations)).toBe(350.5);
  });

  it("calculates balance (due - paid)", () => {
    const allocations = [{ amountApplied: "300.00" }];
    // 750 - 300 = 450
    expect(calculateBalance(item, allocations)).toBe(450);
  });

  it("calculates negative balance as credit when overpaid or cancelled after payment", () => {
    const cancelledItem = {
      quantity: 2,
      quantityCancelled: 2, // cancelled completely
      snapshotUnitPrice: 100,
    };
    const allocations = [{ amountApplied: 200 }];
    // due is 0, paid is 200, balance = -200 (credit)
    expect(calculateBalance(cancelledItem, allocations)).toBe(-200);
  });

  describe("derivePaymentStatus", () => {
    it("returns UNPAID when 0 paid", () => {
      expect(derivePaymentStatus(item, [])).toBe("UNPAID");
    });

    it("returns PARTIAL when paid < due", () => {
      expect(derivePaymentStatus(item, [{ amountApplied: 200 }])).toBe("PARTIAL");
    });

    it("returns PAID when paid == due", () => {
      expect(derivePaymentStatus(item, [{ amountApplied: 750 }])).toBe("PAID");
    });

    it("returns CREDIT when paid > due", () => {
      expect(derivePaymentStatus(item, [{ amountApplied: 800 }])).toBe("CREDIT");
    });
  });
});
