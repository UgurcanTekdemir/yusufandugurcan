import "server-only";

/**
 * Cache interface for Redis-based caching
 * All keys are versioned: ${CACHE_PREFIX}${version}:${key}
 */
export interface Cache {
  /**
   * Get JSON value from cache
   */
  getJSON<T>(key: string): Promise<T | null>;

  /**
   * Set JSON value in cache with TTL in seconds
   */
  setJSON<T>(key: string, value: T, ttlSeconds: number): Promise<void>;

  /**
   * Delete a key from cache
   */
  del(key: string): Promise<void>;

  /**
   * Get current cache version
   */
  getVersion(): Promise<number>;

  /**
   * Increment cache version (invalidates all cached data)
   */
  bumpVersion(): Promise<number>;
}

