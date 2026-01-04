import "server-only";

/**
 * SportMonks API v3 Client
 * Server-only wrapper for SportMonks API with caching support
 */

const BASE_URL = "https://api.sportmonks.com/v3";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// In-memory cache (pluggable to Redis later)
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get SportMonks API token from environment variables
 */
function getApiToken(): string {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) {
    throw new Error("SPORTMONKS_API_TOKEN environment variable is required");
  }
  return token;
}

/**
 * Memory cache wrapper (pluggable to Redis later)
 */
async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // Default 5 minutes
): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key);

  // Return cached data if still valid
  if (cached && cached.expiresAt > now) {
    return cached.data as T;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache the data
  cache.set(key, {
    data,
    expiresAt: now + ttl,
  });

  return data;
}

/**
 * Clear expired cache entries (periodic cleanup)
 */
function clearExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

// Clean up expired cache entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(clearExpiredCache, 5 * 60 * 1000);
}

/**
 * Generic fetch wrapper for SportMonks API
 */
async function fetchSportMonks<T>(
  endpoint: string,
  params?: Record<string, string>,
  ttl?: number
): Promise<T> {
  const token = getApiToken();
  const url = new URL(`${BASE_URL}${endpoint}`);

  // Add API token as query parameter
  url.searchParams.set("api_token", token);

  // Add additional query parameters
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  // Create cache key from endpoint and params
  const cacheKey = `${endpoint}?${url.searchParams.toString()}`;

  return fetchWithCache<T>(
    cacheKey,
    async () => {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `SportMonks API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      return data as T;
    },
    ttl
  );
}

/**
 * SportMonks API client
 */
export const sportmonksClient = {
  /**
   * Fetch countries
   */
  async getCountries(ttl: number = 60 * 60 * 1000): Promise<unknown> {
    return fetchSportMonks("/core/countries", undefined, ttl);
  },

  /**
   * Fetch leagues for a country
   */
  async getLeagues(
    countryId: string | number,
    ttl: number = 30 * 60 * 1000
  ): Promise<unknown> {
    return fetchSportMonks(`/core/countries/${countryId}/leagues`, undefined, ttl);
  },

  /**
   * Fetch seasons for a league
   */
  async getSeasons(
    leagueId: string | number,
    ttl: number = 30 * 60 * 1000
  ): Promise<unknown> {
    return fetchSportMonks(`/core/seasons/leagues/${leagueId}`, undefined, ttl);
  },

  /**
   * Fetch stages for a season
   */
  async getStages(
    seasonId: string | number,
    ttl: number = 30 * 60 * 1000
  ): Promise<unknown> {
    return fetchSportMonks(`/core/stages/seasons/${seasonId}`, undefined, ttl);
  },

  /**
   * Fetch rounds for a season/stage
   */
  async getRounds(
    seasonId: string | number,
    stageId?: string | number,
    ttl: number = 15 * 60 * 1000
  ): Promise<unknown> {
    if (stageId) {
      return fetchSportMonks(
        `/core/rounds/seasons/${seasonId}/stages/${stageId}`,
        undefined,
        ttl
      );
    }
    return fetchSportMonks(`/core/rounds/seasons/${seasonId}`, undefined, ttl);
  },

  /**
   * Fetch fixtures for a league/date
   */
  async getFixtures(
    leagueId: string | number,
    date?: string,
    ttl: number = 5 * 60 * 1000
  ): Promise<unknown> {
    const params: Record<string, string> = {};
    if (date) {
      params.date = date;
    }
    return fetchSportMonks(
      `/core/fixtures/leagues/${leagueId}`,
      params,
      ttl
    );
  },

  /**
   * Fetch live scores
   */
  async getLivescores(ttl: number = 30 * 1000): Promise<unknown> {
    return fetchSportMonks("/core/livescores/inplay", undefined, ttl);
  },

  /**
   * Fetch prematch odds for a fixture
   */
  async getPrematchOdds(
    fixtureId: string | number,
    ttl: number = 2 * 60 * 1000
  ): Promise<unknown> {
    return fetchSportMonks(
      `/odds/pre-match/fixtures/${fixtureId}`,
      undefined,
      ttl
    );
  },

  /**
   * Fetch in-play odds for a fixture
   */
  async getInplayOdds(
    fixtureId: string | number,
    ttl: number = 30 * 1000
  ): Promise<unknown> {
    return fetchSportMonks(
      `/odds/in-play/fixtures/${fixtureId}`,
      undefined,
      ttl
    );
  },

  /**
   * Fetch latest fixtures since a timestamp
   */
  async getFixturesLatest(
    since?: string,
    ttl: number = 60 * 1000
  ): Promise<unknown> {
    const params: Record<string, string> = {};
    if (since) {
      params.since = since;
    }
    return fetchSportMonks("/core/fixtures/latest", params, ttl);
  },
};

