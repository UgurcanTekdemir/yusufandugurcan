import "server-only";
import { redisCache } from "@/lib/cache/redisCache";

/**
 * SportMonks API v3 Client
 * Server-only wrapper for SportMonks API with Redis caching, rate limiting, and locale handling
 */

const BASE_URL = "https://api.sportmonks.com/v3";

/**
 * Rate limit information from SportMonks API
 */
export interface RateLimitInfo {
  remaining?: number;
  reset?: number;
  limit?: number;
}

/**
 * SportMonks supported locales (Turkish not supported - fallback to 'en')
 */
const SUPPORTED_LOCALES = ["zh", "ja", "ru", "fa", "ar", "el", "it", "es", "fr", "hu", "de", "en"] as const;

/**
 * Normalize locale - fallback to 'en' if not supported or 'tr'
 */
function normalizeLocale(locale?: string): string {
  if (!locale || locale === "tr") {
    return "en";
  }
  return SUPPORTED_LOCALES.includes(locale as any) ? locale : "en";
}

// Simple metrics for logging
const metrics = {
  requests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  rateLimitErrors: 0,
};

/**
 * Get SportMonks API token from environment variables
 */
function getApiToken(): string {
  const token = process.env.SPORTMONKS_TOKEN || process.env.SPORTMONKS_API_TOKEN;
  if (!token) {
    throw new Error("SPORTMONKS_TOKEN environment variable is required");
  }
  return token;
}

/**
 * Extract rate limit info from response headers or body
 */
function extractRateLimitInfo(response: Response, body?: unknown): RateLimitInfo {
  const info: RateLimitInfo = {};

  // Try headers first
  const remaining = response.headers.get("X-RateLimit-Remaining");
  const reset = response.headers.get("X-RateLimit-Reset");
  const limit = response.headers.get("X-RateLimit-Limit");

  if (remaining) info.remaining = parseInt(remaining, 10);
  if (reset) info.reset = parseInt(reset, 10);
  if (limit) info.limit = parseInt(limit, 10);

  // Try body if headers don't have info
  if (body && typeof body === "object" && "rate_limit" in body) {
    const rateLimit = (body as { rate_limit?: RateLimitInfo }).rate_limit;
    if (rateLimit) {
      info.remaining = rateLimit.remaining ?? info.remaining;
      info.reset = rateLimit.reset ?? info.reset;
      info.limit = rateLimit.limit ?? info.limit;
    }
  }

  return info;
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateBackoffDelay(attempt: number, baseDelay: number = 1000, maxDelay: number = 30000): number {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Redis cache wrapper
 */
async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // Default 5 minutes in milliseconds
): Promise<T> {
  // Try to get from cache
  const cached = await redisCache.getJSON<T>(key);
  if (cached !== null) {
    metrics.cacheHits++;
    return cached;
  }

  // Fetch fresh data
  metrics.cacheMisses++;
  const data = await fetcher();

  // Cache the data (convert TTL from ms to seconds)
  const ttlSeconds = Math.floor(ttl / 1000);
  await redisCache.setJSON(key, data, ttlSeconds);

  return data;
}

/**
 * Query parameters for SportMonks API
 */
export interface SportMonksQueryParams {
  include?: string;
  select?: string;
  filters?: string;
  locale?: string;
  per_page?: number;
  page?: number;
  order?: string;
  [key: string]: string | number | undefined;
}

/**
 * Generic fetch wrapper for SportMonks API with 429 error handling
 */
async function fetchSportMonks<T>(
  endpoint: string,
  params?: SportMonksQueryParams,
  ttl?: number,
  maxRetries: number = 3
): Promise<T> {
  const token = getApiToken();
  const url = new URL(`${BASE_URL}${endpoint}`);

  // Add API token as query parameter
  url.searchParams.set("api_token", token);

  // Normalize locale if provided
  if (params?.locale) {
    params.locale = normalizeLocale(params.locale);
  }

  // Add additional query parameters
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // Create cache key from endpoint and sorted params for consistency
  const sortedParams = new URLSearchParams(url.searchParams);
  sortedParams.sort();
  const cacheKey = `${endpoint}?${sortedParams.toString()}`;

  return fetchWithCache<T>(
    cacheKey,
    async () => {
      let lastError: Error | null = null;
      let lastRateLimitInfo: RateLimitInfo | null = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          metrics.requests++;

          const response = await fetch(url.toString(), {
            headers: {
              Accept: "application/json",
            },
          });

          if (response.status === 429) {
            metrics.rateLimitErrors++;
            lastRateLimitInfo = extractRateLimitInfo(response);

            // Log rate limit info
            console.warn(`SportMonks rate limit (429):`, {
              endpoint,
              attempt: attempt + 1,
              rateLimitInfo: lastRateLimitInfo,
            });

            // If we have retries left, wait and retry
            if (attempt < maxRetries) {
              const delay = calculateBackoffDelay(attempt);
              // If we have reset time, use it (convert to ms)
              const waitTime = lastRateLimitInfo.reset
                ? Math.max(delay, (lastRateLimitInfo.reset - Date.now() / 1000) * 1000)
                : delay;
              await sleep(Math.min(waitTime, 30000)); // Max 30s wait
              continue;
            }

            // No more retries
            throw new Error(
              `SportMonks API rate limit exceeded (429). Rate limit info: ${JSON.stringify(lastRateLimitInfo)}`
            );
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `SportMonks API error: ${response.status} ${response.statusText} - ${errorText}`
            );
          }

          const data = await response.json();
          return data as T;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (attempt === maxRetries) {
            throw lastError;
          }
        }
      }

      throw lastError || new Error("Failed to fetch from SportMonks API");
    },
    ttl
  );
}

/**
 * SportMonks API client
 */
export const sportmonksClient = {
  /**
   * Get cache statistics
   */
  getMetrics() {
    return {
      ...metrics,
      cacheHitRatio: metrics.requests > 0 ? metrics.cacheHits / metrics.requests : 0,
    };
  },

  /**
   * Fetch continents (static cache - 24h)
   */
  async getContinents(locale?: string, ttl: number = 24 * 60 * 60 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    return fetchSportMonks("/core/continents", params, ttl);
  },

  /**
   * Fetch countries (static cache - 24h)
   */
  async getCountries(locale?: string, ttl: number = 24 * 60 * 60 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    return fetchSportMonks("/core/countries", params, ttl);
  },

  /**
   * Fetch regions (static cache - 24h)
   */
  async getRegions(searchQuery?: string, locale?: string, ttl: number = 24 * 60 * 60 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    if (searchQuery) {
      return fetchSportMonks(`/core/regions/search/${encodeURIComponent(searchQuery)}`, params, ttl);
    }
    return fetchSportMonks("/core/regions", params, ttl);
  },

  /**
   * Fetch cities (static cache - 24h)
   */
  async getCities(locale?: string, ttl: number = 24 * 60 * 60 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    return fetchSportMonks("/core/cities", params, ttl);
  },

  /**
   * Fetch bookmakers (static cache - 24h)
   */
  async getBookmakers(locale?: string, ttl: number = 24 * 60 * 60 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    return fetchSportMonks("/odds/bookmakers", params, ttl);
  },

  /**
   * Fetch markets (static cache - 24h)
   */
  async getMarkets(locale?: string, ttl: number = 24 * 60 * 60 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    return fetchSportMonks("/odds/markets", params, ttl);
  },

  /**
   * Fetch leagues (short cache - 1-5 min)
   */
  async getLeagues(countryId?: string | number, locale?: string, ttl: number = 5 * 60 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    if (countryId) {
      return fetchSportMonks(`/football/leagues/countries/${countryId}`, params, ttl);
    }
    return fetchSportMonks("/football/leagues", params, ttl);
  },

  /**
   * Fetch seasons (short cache - 1-5 min)
   */
  async getSeasons(leagueId?: string | number, locale?: string, ttl: number = 5 * 60 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    if (leagueId) {
      params.filters = `league_id:${leagueId}`;
    }
    return fetchSportMonks("/football/seasons", params, ttl);
  },

  /**
   * Fetch stages (short cache - 1-5 min)
   */
  async getStages(seasonId?: string | number, locale?: string, ttl: number = 5 * 60 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    if (seasonId) {
      params.filters = `season_id:${seasonId}`;
    }
    return fetchSportMonks("/football/stages", params, ttl);
  },

  /**
   * Fetch rounds (short cache - 1-5 min)
   */
  async getRounds(
    seasonId?: string | number,
    stageId?: string | number,
    locale?: string,
    ttl: number = 5 * 60 * 1000
  ): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    if (seasonId) {
      params.filters = stageId ? `season_id:${seasonId};stage_id:${stageId}` : `season_id:${seasonId}`;
    }
    return fetchSportMonks("/football/rounds", params, ttl);
  },

  /**
   * Fetch fixtures (short cache - 1-5 min)
   * Supports date, between dates, leagueId filter, include parameter
   */
  async getFixtures(
    options?: {
      leagueId?: string | number;
      date?: string;
      startDate?: string;
      endDate?: string;
      locale?: string;
      include?: string;
    },
    ttl: number = 5 * 60 * 1000
  ): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (options?.locale) params.locale = options.locale;
    if (options?.include) params.include = options.include;
    else params.include = "participants"; // Default for prematch
    
    // If we have both date and leagueId, use between endpoint (same date) with filters
    if (options?.date && options?.leagueId) {
      params.filters = `league_id:${options.leagueId}`;
      return fetchSportMonks(`/football/fixtures/between/${options.date}/${options.date}`, params, ttl);
    }
    
    if (options?.startDate && options?.endDate) {
      if (options?.leagueId) {
        params.filters = `league_id:${options.leagueId}`;
      }
      return fetchSportMonks(`/football/fixtures/between/${options.startDate}/${options.endDate}`, params, ttl);
    }
    
    // If only date (no leagueId), use date endpoint (no filters supported)
    if (options?.date) {
      return fetchSportMonks(`/football/fixtures/date/${options.date}`, params, ttl);
    }
    
    // If only leagueId (no date), use filters on general endpoint
    if (options?.leagueId) {
      params.filters = `league_id:${options.leagueId}`;
    }
    
    return fetchSportMonks("/football/fixtures", params, ttl);
  },

  /**
   * Fetch fixture by ID (short cache - 1-5 min)
   */
  async getFixtureById(fixtureId: string | number, locale?: string, ttl: number = 5 * 60 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    return fetchSportMonks(`/football/fixtures/${fixtureId}`, params, ttl);
  },

  /**
   * Fetch latest fixtures since timestamp (ultra-short cache - 10-30s)
   */
  async getFixturesLatest(since?: string, locale?: string, ttl: number = 30 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    if (since) {
      params.filters = `since:${since}`;
    }
    return fetchSportMonks("/football/fixtures/latest", params, ttl);
  },

  /**
   * Fetch live scores (ultra-short cache - 10-30s)
   */
  async getLivescores(locale?: string, ttl: number = 30 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    return fetchSportMonks("/football/livescores", params, ttl);
  },

  /**
   * Fetch in-play live scores (ultra-short cache - 10-30s)
   * Includes participants and scores by default
   */
  async getLivescoresInplay(locale?: string, include?: string, ttl: number = 30 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    if (include) params.include = include;
    else params.include = "participants,scores"; // Default for live fixtures
    return fetchSportMonks("/football/livescores/inplay", params, ttl);
  },

  /**
   * Fetch latest live scores (ultra-short cache - 10-30s)
   */
  async getLivescoresLatest(locale?: string, ttl: number = 10 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    return fetchSportMonks("/football/livescores/latest", params, ttl);
  },

  /**
   * Fetch prematch odds by fixture with bookmaker filter (30-120s cache)
   */
  async getPrematchOddsByFixture(
    fixtureId: string | number,
    bookmakerId: string | number = 2, // bet365 default
    locale?: string,
    ttl: number = 120 * 1000
  ): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    return fetchSportMonks(`/football/odds/pre-match/fixtures/${fixtureId}/bookmakers/${bookmakerId}`, params, ttl);
  },

  /**
   * Fetch latest prematch odds (ultra-short cache - 10-30s)
   */
  async getPrematchOddsLatest(locale?: string, ttl: number = 10 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    return fetchSportMonks("/football/odds/pre-match/latest", params, ttl);
  },

  /**
   * Fetch inplay odds by fixture with optional bookmaker filter (ultra-short cache - 10-30s)
   */
  async getInplayOddsByFixture(
    fixtureId: string | number,
    bookmakerId?: string | number,
    locale?: string,
    ttl: number = 30 * 1000
  ): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    if (bookmakerId) {
      return fetchSportMonks(`/football/odds/inplay/fixtures/${fixtureId}/bookmakers/${bookmakerId}`, params, ttl);
    }
    return fetchSportMonks(`/football/odds/inplay/fixtures/${fixtureId}`, params, ttl);
  },

  /**
   * Fetch latest inplay odds (ultra-short cache - 10-30s)
   */
  async getInplayOddsLatest(locale?: string, ttl: number = 10 * 1000): Promise<unknown> {
    const params: SportMonksQueryParams = {};
    if (locale) params.locale = locale;
    return fetchSportMonks("/football/odds/inplay/latest", params, ttl);
  },

  // Legacy methods for backward compatibility (will be deprecated)
  /**
   * @deprecated Use getPrematchOddsByFixture instead
   */
  async getPrematchOdds(fixtureId: string | number, ttl: number = 2 * 60 * 1000): Promise<unknown> {
    return this.getPrematchOddsByFixture(fixtureId, 2, undefined, ttl);
  },

  /**
   * @deprecated Use getInplayOddsByFixture instead
   */
  async getInplayOdds(fixtureId: string | number, ttl: number = 30 * 1000): Promise<unknown> {
    return this.getInplayOddsByFixture(fixtureId, undefined, undefined, ttl);
  },

  /**
   * @deprecated Use getLivescoresInplay instead
   */
  async getLivescoresLegacy(ttl: number = 30 * 1000): Promise<unknown> {
    return this.getLivescoresInplay(undefined, ttl);
  },
};
