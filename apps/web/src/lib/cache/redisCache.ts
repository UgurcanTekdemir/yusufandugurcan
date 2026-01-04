import "server-only";
import { Redis } from "@upstash/redis";
import type { Cache } from "./cache";

/**
 * Get Upstash Redis client instance
 */
function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "⚠️  Upstash Redis not configured. Cache operations will fail. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables."
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
 * Get cache prefix from environment
 */
function getCachePrefix(): string {
  return process.env.CACHE_PREFIX || "sm:";
}

/**
 * Get cache version key from environment
 */
function getCacheVersionKey(): string {
  return process.env.CACHE_VERSION_KEY || "sm:cache_version";
}

/**
 * Redis cache implementation
 */
class RedisCache implements Cache {
  private redis: Redis | null;
  private cachePrefix: string;
  private versionKey: string;

  constructor() {
    this.redis = getRedisClient();
    this.cachePrefix = getCachePrefix();
    this.versionKey = getCacheVersionKey();
  }

  /**
   * Get current cache version (defaults to 1)
   */
  async getVersion(): Promise<number> {
    if (!this.redis) {
      return 1; // Default version when Redis is not available
    }
    try {
      const version = await this.redis.get<number>(this.versionKey);
      return version ?? 1;
    } catch (error) {
      console.error("Error getting cache version:", error);
      return 1; // Default to version 1 on error
    }
  }

  /**
   * Build versioned cache key
   */
  private async buildKey(key: string): Promise<string> {
    const version = await this.getVersion();
    return `${this.cachePrefix}${version}:${key}`;
  }

  /**
   * Get JSON value from cache
   */
  async getJSON<T>(key: string): Promise<T | null> {
    if (!this.redis) {
      return null; // Cache miss when Redis is not available
    }
    try {
      const versionedKey = await this.buildKey(key);
      const value = await this.redis.get<T>(versionedKey);
      return value ?? null;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null; // Return null on error (cache miss)
    }
  }

  /**
   * Set JSON value in cache with TTL in seconds
   */
  async setJSON<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.redis) {
      return; // Skip caching when Redis is not available
    }
    try {
      const versionedKey = await this.buildKey(key);
      await this.redis.set(versionedKey, value, {
        ex: ttlSeconds, // Expire in seconds
      });
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
      // Don't throw - cache set failures shouldn't break the application
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    if (!this.redis) {
      return; // Skip deletion when Redis is not available
    }
    try {
      const versionedKey = await this.buildKey(key);
      await this.redis.del(versionedKey);
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
      // Don't throw - cache delete failures shouldn't break the application
    }
  }

  /**
   * Increment cache version (invalidates all cached data)
   */
  async bumpVersion(): Promise<number> {
    if (!this.redis) {
      throw new Error("Redis is not configured. Cannot bump cache version.");
    }
    try {
      // Use Redis INCR to atomically increment version
      const newVersion = await this.redis.incr(this.versionKey);
      return newVersion;
    } catch (error) {
      console.error("Error bumping cache version:", error);
      throw new Error("Failed to bump cache version");
    }
  }
}

/**
 * Singleton Redis cache instance
 */
export const redisCache = new RedisCache();

