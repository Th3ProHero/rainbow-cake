import { describe, it, expect } from "vitest";
import { deriveOrderStatus } from "@/lib/domain/order";

describe("deriveOrderStatus", () => {
  it("returns OPEN for empty items list", () => {
    expect(deriveOrderStatus([])).toBe("OPEN");
  });

  it("returns OPEN when at least one item is pending or in transit or in warehouse", () => {
    expect(deriveOrderStatus([{ status: "PENDING" }])).toBe("OPEN");
    expect(deriveOrderStatus([{ status: "IN_TRANSIT" }, { status: "DELIVERED" }])).toBe("OPEN");
    expect(deriveOrderStatus([{ status: "IN_WAREHOUSE" }, { status: "CANCELLED" }])).toBe("OPEN");
    expect(deriveOrderStatus([{ status: "PARTIALLY_DELIVERED" }])).toBe("OPEN");
  });

  it("returns COMPLETED when all items are delivered or cancelled with at least one delivered", () => {
    expect(deriveOrderStatus([{ status: "DELIVERED" }])).toBe("COMPLETED");
    expect(deriveOrderStatus([{ status: "DELIVERED" }, { status: "CANCELLED" }])).toBe("COMPLETED");
    expect(
      deriveOrderStatus([
        { status: "DELIVERED" },
        { status: "DELIVERED" },
        { status: "CANCELLED" },
      ])
    ).toBe("COMPLETED");
  });

  it("returns CANCELLED when all items are cancelled", () => {
    expect(deriveOrderStatus([{ status: "CANCELLED" }])).toBe("CANCELLED");
    expect(deriveOrderStatus([{ status: "CANCELLED" }, { status: "CANCELLED" }])).toBe("CANCELLED");
  });
});
