import { describe, it, expect } from "vitest";
import {
  maxDeliverable,
  applyDelivery,
  applyCancellation,
  canUserCancel,
  validateStatusTransition,
} from "@/lib/domain/order-item";

describe("OrderItem Domain Logic", () => {
  describe("maxDeliverable", () => {
    it("calculates correct deliverable quantity", () => {
      expect(
        maxDeliverable({
          quantity: 5,
          quantityDelivered: 2,
          quantityCancelled: 1,
          status: "PARTIALLY_DELIVERED",
        })
      ).toBe(2);
    });
  });

  describe("applyDelivery", () => {
    it("rejects 0 or negative delivery quantity", () => {
      const item = {
        quantity: 3,
        quantityDelivered: 0,
        quantityCancelled: 0,
        status: "PENDING" as const,
      };
      const result = applyDelivery(item, 0);
      expect(result.error).toBeDefined();
    });

    it("rejects delivery exceeding max deliverable", () => {
      const item = {
        quantity: 3,
        quantityDelivered: 1,
        quantityCancelled: 1,
        status: "PARTIALLY_DELIVERED" as const,
      };
      const result = applyDelivery(item, 2); // max is 3 - 1 - 1 = 1
      expect(result.error).toBeDefined();
    });

    it("transitions to PARTIALLY_DELIVERED when some units delivered", () => {
      const item = {
        quantity: 5,
        quantityDelivered: 0,
        quantityCancelled: 0,
        status: "IN_WAREHOUSE" as const,
      };
      const result = applyDelivery(item, 2);
      expect(result.error).toBeUndefined();
      expect(result.quantityDelivered).toBe(2);
      expect(result.status).toBe("PARTIALLY_DELIVERED");
    });

    it("transitions to DELIVERED when all units delivered", () => {
      const item = {
        quantity: 4,
        quantityDelivered: 2,
        quantityCancelled: 0,
        status: "PARTIALLY_DELIVERED" as const,
      };
      const result = applyDelivery(item, 2);
      expect(result.error).toBeUndefined();
      expect(result.quantityDelivered).toBe(4);
      expect(result.status).toBe("DELIVERED");
    });

    it("transitions to DELIVERED when all remaining non-cancelled units delivered", () => {
      const item = {
        quantity: 5,
        quantityDelivered: 1,
        quantityCancelled: 2,
        status: "PARTIALLY_DELIVERED" as const,
      };
      // remaining effective is 5 - 2 = 3. Already delivered 1. Deliver 2.
      const result = applyDelivery(item, 2);
      expect(result.error).toBeUndefined();
      expect(result.quantityDelivered).toBe(3);
      expect(result.status).toBe("DELIVERED");
    });
  });

  describe("applyCancellation", () => {
    it("cancels all units if none delivered, setting status CANCELLED", () => {
      const item = {
        quantity: 3,
        quantityDelivered: 0,
        quantityCancelled: 0,
        status: "PENDING" as const,
      };
      const result = applyCancellation(item);
      expect(result.quantityDelivered).toBe(0);
      expect(result.quantityCancelled).toBe(3);
      expect(result.status).toBe("CANCELLED");
    });

    it("cancels only undelivered units if partial delivery was made, setting status DELIVERED", () => {
      const item = {
        quantity: 5,
        quantityDelivered: 2,
        quantityCancelled: 0,
        status: "PARTIALLY_DELIVERED" as const,
      };
      const result = applyCancellation(item);
      expect(result.quantityDelivered).toBe(2);
      expect(result.quantityCancelled).toBe(3);
      expect(result.status).toBe("DELIVERED");
    });
  });

  describe("canUserCancel", () => {
    it("allows cancel only when status is PENDING", () => {
      expect(canUserCancel({ quantity: 1, quantityDelivered: 0, quantityCancelled: 0, status: "PENDING" })).toBe(true);
      expect(canUserCancel({ quantity: 1, quantityDelivered: 0, quantityCancelled: 0, status: "IN_TRANSIT" })).toBe(false);
      expect(canUserCancel({ quantity: 1, quantityDelivered: 0, quantityCancelled: 0, status: "IN_WAREHOUSE" })).toBe(false);
      expect(canUserCancel({ quantity: 1, quantityDelivered: 0, quantityCancelled: 0, status: "DELIVERED" })).toBe(false);
      expect(canUserCancel({ quantity: 1, quantityDelivered: 0, quantityCancelled: 0, status: "CANCELLED" })).toBe(false);
    });
  });

  describe("validateStatusTransition", () => {
    it("allows admin to make any transition", () => {
      expect(validateStatusTransition("PENDING", "DELIVERED", true).valid).toBe(true);
      expect(validateStatusTransition("DELIVERED", "IN_WAREHOUSE", true).valid).toBe(true);
    });

    it("prevents non-admin from changing arbitrary statuses", () => {
      expect(validateStatusTransition("PENDING", "IN_TRANSIT", false).valid).toBe(false);
    });
  });
});
