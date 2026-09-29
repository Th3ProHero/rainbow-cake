/**
 * In-memory sliding window rate limiter.
 * Single instance suitable, zero external dependencies.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      // Remove timestamps older than 2 hours
      record.timestamps = record.timestamps.filter((t) => now - t < 2 * 60 * 60 * 1000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

/**
 * Check rate limit for a given key.
 *
 * @param key unique identifier (e.g., "login:email@domain.com" or "register:ip")
 * @param limit maximum allowed requests within window
 * @param windowMs time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = rateLimitStore.get(key) || { timestamps: [] };

  // In development, allow up to 100 attempts to prevent locking out during testing
  const effectiveLimit =
    process.env.NODE_ENV !== "production" ? Math.max(limit, 100) : limit;

  if (record.timestamps.length >= effectiveLimit) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, oldest + windowMs - now);
    rateLimitStore.set(key, record);
    return {
      allowed: false,
      remaining: 0,
      resetMs,
    };
  }

  // Record this attempt
  record.timestamps.push(now);
  rateLimitStore.set(key, record);

  const resetMs = windowMs;
  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    resetMs,
  };
}

/**
 * Reset rate limit for a key (e.g. after successful login).
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// Preset helpers
export const RATE_LIMITS = {
  login: { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 min
  register: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  passwordReset: { limit: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
};
