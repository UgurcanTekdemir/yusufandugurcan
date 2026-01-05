import "server-only";

/**
 * SportMonks API v3 Client
 * Server-only wrapper for SportMonks API
 */

const BASE_URL = "https://api.sportmonks.com/v3/football";
const CORE_BASE_URL = "https://api.sportmonks.com/v3"; // For core endpoints like /core/countries
const TIMEOUT_MS = 15000; // 15 seconds

/**
 * Get SportMonks API token from environment variables
 * Throws if token is missing
 */
function mustToken(): string {
  const token = process.env.SPORTMONKS_API_TOKEN;
  if (!token) {
    throw new Error("Missing env: SPORTMONKS_API_TOKEN");
  }
  return token;
}

/**
 * Common helper function to fetch from SportMonks API
 * @param path API path relative to BASE_URL (e.g., "/fixtures/date/2024-01-01")
 * @param params Query parameters (will be converted to URLSearchParams)
 * @returns Promise with { ok: boolean, status: number, body: string }
 */
async function smGet(
  path: string,
  params?: Record<string, string | number | undefined | null>
): Promise<{ ok: boolean; status: number; body: string }> {
  const token = mustToken();
  const url = new URL(BASE_URL + path);

  // Add API token as query parameter
  url.searchParams.set("api_token", token);

  // Build query parameters (skip undefined/null/empty)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    const body = await response.text();

    if (!response.ok) {
      // Log upstream error (sanitize URL to remove token)
      const sanitizedUrl = url.toString().replace(/api_token=[^&]*/, "api_token=***");
      console.error(
        `[SportMonks ERROR] ${response.status} ${response.statusText} - URL: ${sanitizedUrl} - Body: ${body}`
      );
      return { ok: false, status: response.status, body };
    }

    return { ok: true, status: response.status, body };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(`SportMonks API request timeout after ${TIMEOUT_MS}ms`);
      }
      throw error;
    }
    throw new Error("Unknown error fetching from SportMonks API");
  }
}

/**
 * SportMonks API client
 */
export const sportmonksClient = {
  /**
   * Fetch leagues for a country
   * GET /leagues/countries/{countryId}
   */
  async getLeaguesByCountryId(
    countryId: number,
    opts?: { include?: string }
  ): Promise<unknown> {
    const params: Record<string, string> = {};
    if (opts?.include) {
      params.include = opts.include;
    }

    const result = await smGet(`/leagues/countries/${countryId}`, params);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },

  /**
   * Fetch fixtures by date
   * GET /fixtures/date/{date}
   * @param date Date in YYYY-MM-DD format
   * @param opts Optional parameters including include (leagueId filtering is done server-side)
   */
  async getFixturesByDate(
    date: string,
    opts?: { include?: string }
  ): Promise<unknown> {
    const params: Record<string, string> = {};
    if (opts?.include) {
      params.include = opts.include;
    }

    const result = await smGet(`/fixtures/date/${date}`, params);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },

  /**
   * Fetch live scores in-play
   * GET /livescores/inplay
   */
  async getLivescoresInplay(opts?: { include?: string }): Promise<unknown> {
    const params: Record<string, string> = {};
    if (opts?.include) {
      params.include = opts.include;
    }

    const result = await smGet("/livescores/inplay", params);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },

  /**
   * Fetch all countries
   * GET /core/countries (SportMonks v3)
   * Note: This endpoint is at /v3/core/countries, not /v3/football/core/countries
   */
  async getCountries(
    opts?: { page?: number; locale?: string }
  ): Promise<unknown> {
    const token = mustToken();
    const params: Record<string, string | number> = {};
    if (opts?.page) {
      params.page = opts.page;
    }
    if (opts?.locale) {
      params.locale = opts.locale;
    }
    
    // Core endpoints use a different base URL
    const url = new URL(`${CORE_BASE_URL}/core/countries`);
    url.searchParams.set("api_token", token);
    
    // Add query parameters
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
        cache: "no-store",
      });
      
      clearTimeout(timeoutId);
      const body = await response.text();
      
      if (!response.ok) {
        // Log upstream error (sanitize URL to remove token)
        const sanitizedUrl = url.toString().replace(/api_token=[^&]*/, "api_token=***");
        console.error(
          `[SportMonks ERROR] ${response.status} ${response.statusText} - URL: ${sanitizedUrl} - Body: ${body}`
        );
        throw new Error(`SportMonks ${response.status}: ${body}`);
      }
      
      return JSON.parse(body);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(`SportMonks API request timeout after ${TIMEOUT_MS}ms`);
        }
        throw error;
      }
      throw new Error("Unknown error fetching from SportMonks API");
    }
  },

  /**
   * Fetch prematch odds for a fixture
   * GET /odds/pre-match/fixtures/{fixtureId}
   * Note: This endpoint may require a specific SportMonks subscription tier
   */
  async getPrematchOdds(fixtureId: number): Promise<unknown> {
    const result = await smGet(`/odds/pre-match/fixtures/${fixtureId}`);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },

  /**
   * Fetch in-play odds for a fixture
   * GET /odds/inplay/fixtures/{fixtureId}
   */
  async getInplayOdds(fixtureId: number): Promise<unknown> {
    const result = await smGet(`/odds/inplay/fixtures/${fixtureId}`);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },
};
