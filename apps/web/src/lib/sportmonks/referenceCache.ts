import "server-only";

/**
 * Reference Entity Cache for SportMonks API
 * Caches rarely-changing entities (states, types, countries, regions, cities)
 * to reduce includes and improve performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface ReferenceEntity {
  id: number;
  name: string;
  developer_name?: string;
  [key: string]: unknown;
}

class ReferenceCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly defaultTTL: number = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get cached entity by key
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached entity
   */
  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instance
const cache = new ReferenceCache();

/**
 * Cache key generators
 */
const CacheKeys = {
  state: (id: number) => `state:${id}`,
  type: (id: number) => `type:${id}`,
  country: (id: number) => `country:${id}`,
  region: (id: number) => `region:${id}`,
  city: (id: number) => `city:${id}`,
  league: (id: number) => `league:${id}`,
  team: (id: number) => `team:${id}`,
  allStates: () => "states:all",
  allTypes: () => "types:all",
  allCountries: () => "countries:all",
  allRegions: () => "regions:all",
  allCities: () => "cities:all",
};

/**
 * Get cached state by ID
 */
export function getCachedState(stateId: number): ReferenceEntity | null {
  return cache.get<ReferenceEntity>(CacheKeys.state(stateId));
}

/**
 * Get cached type by ID
 */
export function getCachedType(typeId: number): ReferenceEntity | null {
  return cache.get<ReferenceEntity>(CacheKeys.type(typeId));
}

/**
 * Get cached country by ID
 */
export function getCachedCountry(countryId: number): ReferenceEntity | null {
  return cache.get<ReferenceEntity>(CacheKeys.country(countryId));
}

/**
 * Get cached league by ID
 */
export function getCachedLeague(leagueId: number): ReferenceEntity | null {
  return cache.get<ReferenceEntity>(CacheKeys.league(leagueId));
}

/**
 * Get cached team by ID
 */
export function getCachedTeam(teamId: number): ReferenceEntity | null {
  return cache.get<ReferenceEntity>(CacheKeys.team(teamId));
}

/**
 * Cache a state entity
 */
export function cacheState(state: ReferenceEntity): void {
  cache.set(CacheKeys.state(state.id), state);
}

/**
 * Cache a type entity
 */
export function cacheType(type: ReferenceEntity): void {
  cache.set(CacheKeys.type(type.id), type);
}

/**
 * Cache a country entity
 */
export function cacheCountry(country: ReferenceEntity): void {
  cache.set(CacheKeys.country(country.id), country);
}

/**
 * Cache a league entity
 */
export function cacheLeague(league: ReferenceEntity): void {
  cache.set(CacheKeys.league(league.id), league);
}

/**
 * Cache a team entity
 */
export function cacheTeam(team: ReferenceEntity): void {
  cache.set(CacheKeys.team(team.id), team);
}

/**
 * Cache all states (bulk)
 */
export function cacheAllStates(states: ReferenceEntity[]): void {
  states.forEach((state) => cacheState(state));
  cache.set(CacheKeys.allStates(), states);
}

/**
 * Cache all types (bulk)
 */
export function cacheAllTypes(types: ReferenceEntity[]): void {
  types.forEach((type) => cacheType(type));
  cache.set(CacheKeys.allTypes(), types);
}

/**
 * Cache all countries (bulk)
 */
export function cacheAllCountries(countries: ReferenceEntity[]): void {
  countries.forEach((country) => cacheCountry(country));
  cache.set(CacheKeys.allCountries(), countries);
}

/**
 * Get all cached states
 */
export function getAllCachedStates(): ReferenceEntity[] | null {
  return cache.get<ReferenceEntity[]>(CacheKeys.allStates());
}

/**
 * Get all cached types
 */
export function getAllCachedTypes(): ReferenceEntity[] | null {
  return cache.get<ReferenceEntity[]>(CacheKeys.allTypes());
}

/**
 * Get all cached countries
 */
export function getAllCachedCountries(): ReferenceEntity[] | null {
  return cache.get<ReferenceEntity[]>(CacheKeys.allCountries());
}

/**
 * Invalidate cache for a specific entity type
 */
export function invalidateCache(type: "state" | "type" | "country" | "league" | "team"): void {
  const stats = cache.getStats();
  const prefix = `${type}:`;
  stats.keys.forEach((key) => {
    if (key.startsWith(prefix)) {
      cache.invalidate(key);
    }
  });
  // Also invalidate bulk cache
  cache.invalidate(`${type}s:all`);
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return cache.getStats();
}

