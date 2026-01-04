import "server-only";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

/**
 * Get Upstash Redis client instance
 */
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "⚠️  Upstash Redis not configured. Rate limiting will be disabled. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables."
      );
      return null;
    }
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are required"
    );
  }

  return new Redis({
    url,
    token,
  });
}

/**
 * Get rate limit prefix from environment
 */
function getRateLimitPrefix(): string {
  return process.env.RATE_LIMIT_PREFIX || "rl:";
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Get rate limit identifier from request
 * Uses authenticated user ID if available, otherwise IP address
 */
export function getRateLimitIdentifier(
  request: NextRequest,
  user?: { uid: string }
): string {
  // Prefer authenticated user ID
  if (user?.uid) {
    return `user:${user.uid}`;
  }

  // Fallback to IP address
  // Check x-forwarded-for header (for proxies/load balancers)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ip = forwardedFor.split(",")[0]?.trim();
    if (ip) {
      return `ip:${ip}`;
    }
  }

  // Check x-real-ip header
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return `ip:${realIp}`;
  }

  // Fallback to a default identifier (shouldn't happen in production)
  return "ip:unknown";
}

/**
 * Check rate limit for an identifier
 * Uses fixed window algorithm with Redis INCR + EXPIRE
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number = 120,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const prefix = getRateLimitPrefix();

  // If Redis is not available, allow all requests (fail open)
  if (!redis) {
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Date.now() + windowSeconds * 1000,
    };
  }

  // Calculate window key (fixed window: floor(timestamp / windowSeconds))
  const windowKey = Math.floor(Date.now() / (windowSeconds * 1000));
  const rateLimitKey = `${prefix}${identifier}:${windowKey}`;

  try {
    // Increment counter
    const count = await redis.incr(rateLimitKey);

    // Set expiry on first request in window (count === 1 means this is the first request)
    if (count === 1) {
      await redis.expire(rateLimitKey, windowSeconds);
    }

    // Calculate remaining requests
    const remaining = Math.max(0, maxRequests - count);

    // Calculate reset time (start of next window)
    const resetAt = (windowKey + 1) * windowSeconds * 1000;

    return {
      allowed: count <= maxRequests,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error("Error checking rate limit:", error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: Date.now() + windowSeconds * 1000,
    };
  }
}

