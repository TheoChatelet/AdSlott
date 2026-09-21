/**
 * Minimal in-memory sliding-window rate limiter for V1 (single instance,
 * no Redis). Good enough to blunt a bid-spamming client; not a substitute
 * for infra-level rate limiting in production.
 */
const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function checkRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const timestamps = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);

  if (timestamps.length >= limit) {
    const retryAfterMs = windowMs - (now - timestamps[0]);
    buckets.set(key, timestamps);
    return { allowed: false, retryAfterMs };
  }

  timestamps.push(now);
  buckets.set(key, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}
