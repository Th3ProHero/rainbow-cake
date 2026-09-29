import { describe, it, expect } from "vitest";
import { isOfferActive, effectivePrice, discountPercentage } from "@/lib/domain/offer";

describe("Offer Domain Logic", () => {
  it("recognizes active offer with no dates", () => {
    const product = { price: 200, offerPrice: 150 };
    expect(isOfferActive(product)).toBe(true);
    expect(effectivePrice(product)).toBe(150);
    expect(discountPercentage(product)).toBe(25);
  });

  it("recognizes inactive offer when offerPrice is missing or 0", () => {
    expect(isOfferActive({ price: 200 })).toBe(false);
    expect(isOfferActive({ price: 200, offerPrice: 0 })).toBe(false);
    expect(effectivePrice({ price: 200 })).toBe(200);
  });

  it("respects offer date ranges", () => {
    const product = {
      price: 300,
      offerPrice: 200,
      offerStartsAt: new Date("2026-09-01"),
      offerEndsAt: new Date("2026-09-30"),
    };

    // Inside range
    expect(isOfferActive(product, new Date("2026-09-15"))).toBe(true);
    expect(effectivePrice(product, new Date("2026-09-15"))).toBe(200);

    // Before range
    expect(isOfferActive(product, new Date("2026-08-31"))).toBe(false);
    expect(effectivePrice(product, new Date("2026-08-31"))).toBe(300);

    // After range
    expect(isOfferActive(product, new Date("2026-10-01"))).toBe(false);
    expect(effectivePrice(product, new Date("2026-10-01"))).toBe(300);
  });
});
