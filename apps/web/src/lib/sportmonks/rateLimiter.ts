import "server-only";

/**
 * Token Bucket Rate Limiter for SportMonks API
 * Implements client-side rate limiting to prevent 429 errors
 */

interface RateLimiterConfig {
  maxTokens: number; // Maximum tokens in bucket
  refillRate: number; // Tokens per second
  initialTokens?: number; // Starting tokens (defaults to maxTokens)
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.tokens = config.initialTokens ?? config.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume a token. Returns true if successful, false if rate limited.
   */
  tryConsume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Wait until a token is available, then consume it.
   */
  async waitForToken(): Promise<void> {
    while (!this.tryConsume()) {
      // Calculate wait time based on refill rate
      const tokensNeeded = 1;
      const waitMs = Math.ceil((tokensNeeded / this.refillRate) * 1000);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Get current token count (for monitoring)
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Default rate limiter configuration
 * Adjust based on your SportMonks plan limits
 * 
 * Example: 100 requests per minute = 100/60 = ~1.67 tokens/sec
 * With burst capacity of 20 tokens
 */
const DEFAULT_CONFIG: RateLimiterConfig = {
  maxTokens: 20, // Burst capacity
  refillRate: 1.5, // Tokens per second (~90 requests per minute)
  initialTokens: 20,
};

// Global rate limiter instance
let rateLimiter: TokenBucket | null = null;

/**
 * Get or create the global rate limiter
 */
function getRateLimiter(): TokenBucket {
  if (!rateLimiter) {
    rateLimiter = new TokenBucket(DEFAULT_CONFIG);
  }
  return rateLimiter;
}

/**
 * Wait for rate limit token before making API request
 */
export async function waitForRateLimit(): Promise<void> {
  const limiter = getRateLimiter();
  await limiter.waitForToken();
}

/**
 * Check if we can make a request immediately (non-blocking)
 */
export function canMakeRequest(): boolean {
  const limiter = getRateLimiter();
  return limiter.tryConsume();
}

/**
 * Handle 429 response with exponential backoff
 */
export async function handle429Backoff(attempt: number): Promise<void> {
  // Exponential backoff with jitter: 0.5s, 1s, 2s, 4s, max 8s
  const baseDelay = Math.min(500 * Math.pow(2, attempt), 8000);
  const jitter = Math.random() * 0.3 * baseDelay; // 0-30% jitter
  const delay = baseDelay + jitter;
  
  console.warn(`[Rate Limiter] 429 received, backing off for ${Math.round(delay)}ms (attempt ${attempt + 1})`);
  await new Promise((resolve) => setTimeout(resolve, delay));
  
  // Reset rate limiter tokens after backoff to be conservative
  const limiter = getRateLimiter();
  // Reduce tokens to prevent immediate re-hit
  (limiter as unknown as { tokens: number }).tokens = Math.max(0, limiter.getTokens() - 5);
}

/**
 * Parse Retry-After header (if present) and wait accordingly
 */
export async function waitForRetryAfter(retryAfter: string | null): Promise<void> {
  if (!retryAfter) {
    return;
  }
  
  let seconds: number;
  const retryAfterNum = parseInt(retryAfter, 10);
  if (!isNaN(retryAfterNum)) {
    seconds = retryAfterNum;
  } else {
    // Try parsing as HTTP date
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      seconds = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
    } else {
      return; // Invalid format, skip
    }
  }
  
  if (seconds > 0) {
    console.warn(`[Rate Limiter] Waiting ${seconds}s per Retry-After header`);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }
}

