/**
 * Domain logic for product offers.
 * Pure functions — no side effects, no database access.
 */

interface ProductForOffer {
  price: number | string;
  offerPrice?: number | string | null;
  offerStartsAt?: Date | string | null;
  offerEndsAt?: Date | string | null;
}

/**
 * Check if a product's offer is currently active.
 * An offer is active if:
 * - offerPrice exists
 * - current date is within [offerStartsAt, offerEndsAt] range (if specified)
 * - if no range, the offer is always active when offerPrice exists
 */
export function isOfferActive(
  product: ProductForOffer,
  now: Date = new Date()
): boolean {
  if (!product.offerPrice) return false;

  const offerPrice =
    typeof product.offerPrice === "string"
      ? parseFloat(product.offerPrice)
      : product.offerPrice;

  if (offerPrice <= 0) return false;

  if (product.offerStartsAt) {
    const start =
      typeof product.offerStartsAt === "string"
        ? new Date(product.offerStartsAt)
        : product.offerStartsAt;
    if (now < start) return false;
  }

  if (product.offerEndsAt) {
    const end =
      typeof product.offerEndsAt === "string"
        ? new Date(product.offerEndsAt)
        : product.offerEndsAt;
    if (now > end) return false;
  }

  return true;
}

/**
 * Get the effective price for a product (considering active offers).
 * This is the price that should be snapshotted when creating an order item.
 */
export function effectivePrice(
  product: ProductForOffer,
  now: Date = new Date()
): number {
  if (isOfferActive(product, now)) {
    const offerPrice =
      typeof product.offerPrice === "string"
        ? parseFloat(product.offerPrice!)
        : (product.offerPrice as number);
    return offerPrice;
  }

  const price =
    typeof product.price === "string"
      ? parseFloat(product.price)
      : product.price;
  return price;
}

/**
 * Calculate discount percentage
 */
export function discountPercentage(product: ProductForOffer): number | null {
  if (!product.offerPrice) return null;

  const price =
    typeof product.price === "string"
      ? parseFloat(product.price)
      : product.price;
  const offerPrice =
    typeof product.offerPrice === "string"
      ? parseFloat(product.offerPrice)
      : product.offerPrice;

  if (price <= 0) return null;
  return Math.round(((price - offerPrice) / price) * 100);
}
