/**
 * In-memory TTL cache implementation
 * Pluggable design - can be replaced with Redis later
 */

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class TTLCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  /**
   * Get cached data by key
   * Returns null if key doesn't exist or has expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data with TTL (time to live in milliseconds)
   */
  set<T>(key: string, data: T, ttl: number): void {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, {
      data,
      expiresAt,
    });
  }

  /**
   * Clear expired entries from cache
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size (number of entries)
   */
  size(): number {
    return this.cache.size;
  }
}

// Singleton instance
const cache = new TTLCache();

// Periodic cleanup - clear expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    cache.clearExpired();
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Get cached data by key
 */
export function getCache<T>(key: string): T | null {
  return cache.get<T>(key);
}

/**
 * Set cached data with TTL (time to live in milliseconds)
 */
export function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, data, ttl);
}

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  cache.clearExpired();
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache size
 */
export function getCacheSize(): number {
  return cache.size();
}

