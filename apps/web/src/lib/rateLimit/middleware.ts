import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getRateLimitIdentifier } from "./rateLimit";
import { getServerAuthUser } from "@/lib/auth/serverAuth";

/**
 * Rate limit configuration
 */
export interface RateLimitOptions {
  maxRequests?: number;
  windowSeconds?: number;
}

/**
 * Get default rate limit configuration from environment
 */
function getDefaultRateLimitConfig(): Required<RateLimitOptions> {
  return {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "120", 10),
    windowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || "60", 10),
  };
}

/**
 * Wrap a route handler with rate limiting
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: RateLimitOptions
): (req: NextRequest) => Promise<NextResponse> {
  const config = {
    ...getDefaultRateLimitConfig(),
    ...options,
  };

  return async (req: NextRequest) => {
    try {
      // Get authenticated user if available
      const user = await getServerAuthUser().catch(() => null);

      // Get rate limit identifier
      const identifier = getRateLimitIdentifier(req, user ?? undefined);

      // Check rate limit
      const rateLimitResult = await checkRateLimit(
        identifier,
        config.maxRequests,
        config.windowSeconds
      );

      if (!rateLimitResult.allowed) {
        // Calculate Retry-After in seconds
        const retryAfter = Math.ceil(
          (rateLimitResult.resetAt - Date.now()) / 1000
        );

        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            retryAfter,
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfter),
              "X-RateLimit-Limit": String(config.maxRequests),
              "X-RateLimit-Remaining": String(rateLimitResult.remaining),
              "X-RateLimit-Reset": String(rateLimitResult.resetAt),
            },
          }
        );
      }

      // Execute handler
      const response = await handler(req);

      // Add rate limit headers to successful responses
      response.headers.set("X-RateLimit-Limit", String(config.maxRequests));
      response.headers.set(
        "X-RateLimit-Remaining",
        String(rateLimitResult.remaining)
      );
      response.headers.set("X-RateLimit-Reset", String(rateLimitResult.resetAt));

      return response;
    } catch (error) {
      console.error("Error in rate limit middleware:", error);
      // On error, execute handler anyway (fail open)
      return handler(req);
    }
  };
}

