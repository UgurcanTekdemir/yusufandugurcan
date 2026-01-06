import "server-only";
import {
  waitForRateLimit,
  handle429Backoff,
  waitForRetryAfter,
} from "./rateLimiter";

/**
 * SportMonks API v3 Client
 * Server-only wrapper for SportMonks API
 */

const BASE_URL = "https://api.sportmonks.com/v3/football";
const CORE_BASE_URL = "https://api.sportmonks.com/v3"; // For core endpoints like /core/countries
const ODDS_BASE_URL = "https://api.sportmonks.com/v3/odds"; // For odds endpoints
const TIMEOUT_MS = 15000; // 15 seconds
const MAX_RETRIES = 3; // Maximum retries for 429 errors

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
 * Implements rate limiting, 429 handling, and retry logic
 * @param path API path relative to BASE_URL (e.g., "/fixtures/date/2024-01-01")
 * @param params Query parameters (will be converted to URLSearchParams)
 * @param baseUrl Optional base URL override (defaults to BASE_URL)
 * @returns Promise with { ok: boolean, status: number, body: string }
 */
async function smGet(
  path: string,
  params?: Record<string, string | number | undefined | null>,
  baseUrl: string = BASE_URL
): Promise<{ ok: boolean; status: number; body: string }> {
  const token = mustToken();
  const url = new URL(baseUrl + path);

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

  // Rate limiting: wait for token before making request
  await waitForRateLimit();

  // Retry logic for 429 errors
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
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

      // Handle 429 Too Many Requests with backoff
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        await waitForRetryAfter(retryAfter);
        await handle429Backoff(attempt);
        attempt++;
        continue; // Retry the request
      }

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

  // If we exhausted retries, throw error
  throw new Error(`SportMonks API rate limit exceeded after ${MAX_RETRIES} retries`);
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
   * @param opts Optional parameters:
   *   - include: e.g., "participants;league" (semicolon separates top-level includes)
   *              e.g., "events:player_name,minute" (colon for field selection, comma for multiple fields)
   *              e.g., "events.player.country:name" (dot for nested relations)
   *   - filters: e.g., "populate" (disable includes, enable 1000 per_page)
   *              e.g., "idAfter:12345" (incremental sync)
   *              e.g., "bookmakers:23" (single filter)
   *              e.g., "eventTypes:14,18" (multiple values, comma-separated)
   *              e.g., "bookmakers:23;markets:1,2" (multiple filters, semicolon-separated)
   *   - select: e.g., "name,starting_at" (comma-separated field names)
   *   - locale: Translation locale
   * 
   * Best practices:
   * - Use filters=populate for bulk fetching (1000 records per page, no includes)
   * - Use filters=idAfter:12345 for incremental sync
   * - Cache reference entities (leagues, teams) instead of using includes
   * - Use field selection in includes to reduce payload: "events:player_name,minute"
   */
  async getFixturesByDate(
    date: string,
    opts?: {
      include?: string;
      filters?: string;
      select?: string;
      locale?: string;
    }
  ): Promise<unknown> {
    const params: Record<string, string> = {};
    if (opts?.include) {
      params.include = opts.include;
    }
    if (opts?.filters) {
      params.filters = opts.filters;
    }
    if (opts?.select) {
      params.select = opts.select;
    }
    if (opts?.locale) {
      params.locale = opts.locale;
    }

    const result = await smGet(`/fixtures/date/${date}`, params);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },

  /**
   * Fetch a single fixture by ID with optional includes, filters, select, and locale
   * GET /fixtures/{fixtureId}
   * @param fixtureId Fixture ID
   * @param opts Optional parameters:
   *   - include: e.g., "statistics.type;lineups.details.type;events.type" or "odds"
   *              Use field selection: "participants:name,short_code;events:player_name,minute"
   *   - filters: e.g., "bookmakers:23" (filter by bookmaker ID)
   *   - select: e.g., "name,starting_at,state" (select specific base entity fields)
   *   - locale: Translation locale
   * Based on SportMonks API v3 documentation
   */
  async getFixtureById(
    fixtureId: number,
    opts?: {
      include?: string;
      filters?: string;
      select?: string;
      locale?: string;
    }
  ): Promise<unknown> {
    const params: Record<string, string> = {};
    if (opts?.include) {
      params.include = opts.include;
    }
    if (opts?.filters) {
      params.filters = opts.filters;
    }
    if (opts?.select) {
      params.select = opts.select;
    }
    if (opts?.locale) {
      params.locale = opts.locale;
    }

    const result = await smGet(`/fixtures/${fixtureId}`, params);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },

  /**
   * Fetch a single team by ID with optional includes and filters
   * GET /teams/{teamId}
   * @param teamId Team ID
   * @param opts Optional parameters including include and filters
   *   - include: e.g., "statistics.details.type" (for team statistics)
   *   - filters: e.g., "teamStatisticSeasons:21638" (filter by season ID)
   * Based on SportMonks API v3 documentation
   */
  async getTeamById(
    teamId: number,
    opts?: { include?: string; filters?: string }
  ): Promise<unknown> {
    const params: Record<string, string> = {};
    if (opts?.include) {
      params.include = opts.include;
    }
    if (opts?.filters) {
      params.filters = opts.filters;
    }

    const result = await smGet(`/teams/${teamId}`, params);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },

  /**
   * Fetch squad (player statistics) for a team in a specific season
   * GET /squads/seasons/{seasonId}/teams/{teamId}
   * @param seasonId Season ID
   * @param teamId Team ID
   * @param opts Optional parameters including include
   *   - include: e.g., "player;details.type" (for player info and statistic details)
   * Based on SportMonks API v3 documentation
   */
  async getSquadBySeasonAndTeam(
    seasonId: number,
    teamId: number,
    opts?: { include?: string }
  ): Promise<unknown> {
    const params: Record<string, string> = {};
    if (opts?.include) {
      params.include = opts.include;
    }

    const result = await smGet(`/squads/seasons/${seasonId}/teams/${teamId}`, params);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },

  /**
   * Fetch a single player by ID with optional includes and filters
   * GET /players/{playerId}
   * @param playerId Player ID
   * @param opts Optional parameters including include and filters
   *   - include: e.g., "statistics.details.type" (for player statistics)
   *   - filters: e.g., "playerStatisticSeasons:21638" (filter by season ID)
   * Based on SportMonks API v3 documentation
   */
  async getPlayerById(
    playerId: number,
    opts?: { include?: string; filters?: string }
  ): Promise<unknown> {
    const params: Record<string, string> = {};
    if (opts?.include) {
      params.include = opts.include;
    }
    if (opts?.filters) {
      params.filters = opts.filters;
    }

    const result = await smGet(`/players/${playerId}`, params);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },

  /**
   * Fetch standings for a specific season
   * GET /standings/seasons/{seasonId}
   * @param seasonId Season ID
   * @param opts Optional parameters including include
   *   - include: e.g., "participant;rule;details.type" (for team info, rules, and statistic details)
   * Based on SportMonks API v3 documentation
   */
  async getStandingsBySeason(
    seasonId: number,
    opts?: { include?: string }
  ): Promise<unknown> {
    const params: Record<string, string> = {};
    if (opts?.include) {
      params.include = opts.include;
    }

    const result = await smGet(`/standings/seasons/${seasonId}`, params);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },

  /**
   * Fetch live scores in-play
   * GET /v3/football/livescores/inplay
   * Returns all the inplay fixtures
   * Include options: sport, round, stage, group, aggregate, league, season, coaches, tvStations, venue, state, weatherReport, lineups, events, timeline, comments, trends, statistics, periods, participants, odds, premiumOdds, inplayOdds, prematchNews, postmatchNews, metadata, sidelined, predictions, referees, formations, ballCoordinates, scores, xGFixture, expectedLineups
   * Query parameters: include, select, filters, locale
   * Static filters (Fixture entity): ParticipantSearch, todayDate, venues, IsDeleted
   * Dynamic filters: types, states, leagues, groups, countries, seasons
   */
  async getLivescoresInplay(opts?: {
    include?: string;
    select?: string;
    filters?: string;
    locale?: string;
  }): Promise<unknown> {
    const params: Record<string, string> = {};
    if (opts?.include) {
      params.include = opts.include;
    }
    if (opts?.select) {
      params.select = opts.select;
    }
    if (opts?.filters) {
      params.filters = opts.filters;
    }
    if (opts?.locale) {
      params.locale = opts.locale;
    }

    const result = await smGet("/livescores/inplay", params);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },

  /**
   * Fetch all livescores (15 minutes before start, 15 minutes after finish)
   * GET /v3/football/livescores
   * Returns fixtures 15 minutes before the game starts and disappears 15 minutes after the game is finished
   * Include options: sport, round, stage, group, aggregate, league, season, coaches, tvStations, venue, state, weatherReport, lineups, events, timeline, comments, trends, statistics, periods, participants, odds, premiumOdds, inplayOdds, prematchNews, postmatchNews, metadata, sidelined, predictions, referees, formations, ballCoordinates, scores, xGFixture, expectedLineups
   * Query parameters: include, select, filters, locale
   * Static filters (Fixture entity): ParticipantSearch, todayDate, venues, IsDeleted
   * Dynamic filters: types, states, leagues, groups, countries, seasons
   */
  async getLivescores(opts?: {
    include?: string;
    select?: string;
    filters?: string;
    locale?: string;
  }): Promise<unknown> {
    const params: Record<string, string> = {};
    if (opts?.include) {
      params.include = opts.include;
    }
    if (opts?.select) {
      params.select = opts.select;
    }
    if (opts?.filters) {
      params.filters = opts.filters;
    }
    if (opts?.locale) {
      params.locale = opts.locale;
    }

    const result = await smGet("/livescores", params);
    if (!result.ok) {
      throw new Error(`SportMonks ${result.status}: ${result.body}`);
    }
    return JSON.parse(result.body);
  },

  /**
   * Fetch latest updated livescores (updated within last 10 seconds)
   * GET /v3/football/livescores/latest
   * Returns all livescores that have received updates within 10 seconds
   * 
   * Definition of "Latest Updated":
   * Returns all fixtures whose livescore data has changed within the last 10 seconds.
   * The update window is fixed at 10 seconds and cannot be altered.
   * 
   * Tracked Fields (8 fields monitored for changes):
   * - state_id: Match phase progressed (e.g., 1→2 at kick-off, 2→3 at half-time)
   * - venue_id: Assigned venue was updated (e.g., moved from stadium A to stadium B)
   * - name: Fixture name text was modified (e.g., team abbreviations or formatting changed)
   * - starting_at: Kick-off time string was rescheduled (e.g., "2024-08-04 15:30:00" to "2024-08-04 16:00:00")
   * - starting_at_timestamp: UNIX timestamp for kick-off was rescheduled (e.g., 1722785400 to 1722787200)
   * - result_info: Score summary text was updated (e.g., "0-0" to "1-0")
   * - leg: Leg designation changed (e.g., "1/2" to "2/2")
   * - length: Fixture duration changed (e.g., 90 to 120 when extra time is added)
   * 
   * Note: Only these 8 fields are monitored. Changes in other data (events, lineups, odds, statistics)
   * do not count toward triggering this endpoint.
   * 
   * Update Behavior & Edge Cases:
   * - If no fixtures changed during the 10-second window, returns 200 OK with "data": []
   * - Empty array response is normal and indicates no updates
   * - Updates usually arrive in small batches
   * - If multiple changes occur to the same fixture within 10 seconds, you may only see the final state
   * - Pay attention to clock skew and network jitter
   * 
   * Polling Strategy & Best Practices:
   * - Recommended polling interval: 5-8 seconds (as long as rate limits permit)
   * - If you detect many consecutive empty responses, consider backing off
   * - Always dedupe via cache: ignore fixtures whose tracked fields haven't changed
   * - Use exponential backoff or pauses when encountering errors
   * 
   * Caching & Diff Logic:
   * - Cache should store for each fixture the current values of the 8 tracked fields
   * - Compare each field with cached version on each poll
   * - If no differences → skip
   * - If any difference → process as update and overwrite cache
   * 
   * Include options: sport, round, stage, group, aggregate, league, season, coaches, tvStations, venue, state, weatherReport, lineups, events, timeline, comments, trends, statistics, periods, participants, odds, premiumOdds, inplayOdds, prematchNews, postmatchNews, metadata, sidelined, predictions, referees, formations, ballCoordinates, scores, xGFixture, expectedLineups
   * Query parameters: include, select, filters, locale
   * Static filters (Fixture entity): ParticipantSearch, todayDate, venues, IsDeleted
   * Dynamic filters: types, states, leagues, groups, countries, seasons
   */
  async getLivescoresLatest(opts?: {
    include?: string;
    select?: string;
    filters?: string;
    locale?: string;
  }): Promise<unknown> {
    const params: Record<string, string> = {};
    if (opts?.include) {
      params.include = opts.include;
    }
    if (opts?.select) {
      params.select = opts.select;
    }
    if (opts?.filters) {
      params.filters = opts.filters;
    }
    if (opts?.locale) {
      params.locale = opts.locale;
    }

    const result = await smGet("/livescores/latest", params);
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
   * Based on SportMonks API v3 documentation
   * Primary endpoint: /v3/football/odds/pre-match/fixtures/{fixtureId}
   * Alternative: /v3/football/fixtures/{fixtureId}?include=odds.preMatch
   * Query parameters: include, select, filters, locale
   * Static filters: markets, bookmakers, winningOdds
   */
  async getPrematchOdds(
    fixtureId: number,
    opts?: {
      include?: string;
      select?: string;
      filters?: string;
      locale?: string;
    }
  ): Promise<unknown> {
    const token = mustToken();
    
    // Try different endpoint patterns (prioritize documented endpoints)
    const endpointPatterns = [
      // Pattern 1: Primary documented endpoint for pre-match odds
      // Endpoint: /v3/football/odds/pre-match/fixtures/{fixtureId}
      {
        baseUrl: BASE_URL,
        path: `/odds/pre-match/fixtures/${fixtureId}`,
        params: {
          include: opts?.include || "market;bookmaker;fixture",
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.filters ? { filters: opts.filters } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 2: Include odds in fixture endpoint (alternative)
      // Endpoint: /v3/football/fixtures/{fixtureId}?include=odds.preMatch
      {
        baseUrl: BASE_URL,
        path: `/fixtures/${fixtureId}`,
        params: {
          include: opts?.include 
            ? `odds.preMatch;${opts.include.split(";").map(inc => `odds.preMatch.${inc}`).join(";")}`
            : "odds.preMatch;odds.preMatch.market;odds.preMatch.bookmaker",
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.filters ? { filters: opts.filters } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 3: Direct odds endpoint (odds base URL)
      {
        baseUrl: ODDS_BASE_URL,
        path: `/pre-match/fixtures/${fixtureId}`,
        params: {
          include: opts?.include || "market;bookmaker;fixture",
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.filters ? { filters: opts.filters } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 4: Fixture with odds array (Bet365-style, with bookmaker filter)
      // Endpoint: /v3/football/fixtures/{fixtureId}?include=odds&filters=bookmakers:23
      // Response: { data: { id: ..., odds: [...] } } where odds is an array of odds objects
      {
        baseUrl: BASE_URL,
        path: `/fixtures/${fixtureId}`,
        params: {
          include: opts?.include || "odds",
          filters: opts?.filters || "bookmakers:23",
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
    ];
    
    const errors: Array<{ pattern: string; error: string }> = [];
    let lastError: Error | null = null;
    
    for (let i = 0; i < endpointPatterns.length; i++) {
      const pattern = endpointPatterns[i]!;
      const patternName = `${pattern.baseUrl}${pattern.path}`;
      
      try {
        const url = new URL(pattern.baseUrl + pattern.path);
        url.searchParams.set("api_token", token);
        
        // Add query parameters
        for (const [key, value] of Object.entries(pattern.params)) {
          if (value !== null && value !== undefined && value !== "") {
            url.searchParams.set(key, String(value));
          }
        }
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        
        try {
          console.log(`[getPrematchOdds] Trying endpoint pattern ${i + 1}/${endpointPatterns.length} for fixture ${fixtureId}: ${patternName}`);
          
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
            const errorMsg = `HTTP ${response.status}: ${body.substring(0, 200)}`;
            errors.push({ pattern: patternName, error: errorMsg });
            
            if (response.status === 404) {
              // Try next pattern
              lastError = new Error(`SportMonks ${response.status}: ${body}`);
              console.log(`[getPrematchOdds] Pattern ${i + 1} returned 404, trying next pattern...`);
              continue;
            }
            const sanitizedUrl = url.toString().replace(/api_token=[^&]*/, "api_token=***");
            console.error(`[getPrematchOdds] API error for fixture ${fixtureId}:`, response.status, response.statusText, "- URL:", sanitizedUrl, "- Body:", body.substring(0, 500));
            throw new Error(`SportMonks ${response.status}: ${body}`);
          }
          
          const parsed = JSON.parse(body);
          
          // Debug: Log response structure
          console.log(`[getPrematchOdds] Success for fixture ${fixtureId} using pattern ${i + 1}:`, {
            pattern: patternName,
            hasData: parsed && typeof parsed === "object" && "data" in parsed,
            isArray: Array.isArray(parsed),
            keys: parsed && typeof parsed === "object" ? Object.keys(parsed) : [],
            dataType: parsed?.data ? (Array.isArray(parsed.data) ? "array" : typeof parsed.data) : "none",
            dataKeys: parsed?.data && typeof parsed.data === "object" && !Array.isArray(parsed.data) ? Object.keys(parsed.data) : [],
            marketsInData: parsed?.data?.markets ? parsed.data.markets.length : parsed?.data?.odds?.preMatch?.markets ? parsed.data.odds.preMatch.markets.length : parsed?.data?.[0]?.markets ? parsed.data[0].markets.length : parsed?.markets ? parsed.markets.length : 0,
            rawPreview: JSON.stringify(parsed).substring(0, 1000),
          });
          
          return parsed;
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === "AbortError") {
            const timeoutError = new Error(`SportMonks API request timeout after ${TIMEOUT_MS}ms`);
            errors.push({ pattern: patternName, error: timeoutError.message });
            throw timeoutError;
          }
          // If it's a 404, try next pattern
          if (error instanceof Error && error.message.includes("404")) {
            errors.push({ pattern: patternName, error: error.message });
            lastError = error;
            continue;
          }
          errors.push({ pattern: patternName, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      } catch (error) {
        // Continue to next pattern
        if (error instanceof Error) {
          if (!errors.some(e => e.pattern === patternName)) {
            errors.push({ pattern: patternName, error: error.message });
          }
          lastError = error;
        }
        continue;
      }
    }
    
    // If all patterns failed, throw a detailed error
    const errorDetails = errors.map(e => `  - ${e.pattern}: ${e.error}`).join("\n");
    const finalError = new Error(
      `All ${endpointPatterns.length} endpoint patterns failed for prematch odds (fixture ${fixtureId}):\n${errorDetails}`
    );
    console.error(`[getPrematchOdds] All patterns failed for fixture ${fixtureId}:`, errors);
    throw finalError;
  },

  /**
   * Fetch in-play odds for a fixture
   * Based on SportMonks API v3 documentation
   * Primary endpoint: /v3/football/odds/inplay/fixtures/{fixtureId}
   * Alternative: /v3/football/fixtures/{fixtureId}?include=odds.inPlay
   * @param fixtureId Fixture ID
   * @param opts Optional parameters:
   *   - include: e.g., "market;bookmaker" (use field selection: "market:name;bookmaker:name")
   *   - select: Select specific fields
   *   - filters: Static or dynamic filters
   *   - locale: Translation locale
   */
  async getInplayOdds(
    fixtureId: number,
    opts?: {
      include?: string;
      select?: string;
      filters?: string;
      locale?: string;
    }
  ): Promise<unknown> {
    const token = mustToken();
    
    // Optimize includes: use field selection to reduce payload
    // Default: include markets and bookmakers with minimal fields
    const optimizedInclude = opts?.include || "markets:name;bookmakers:name";
    
    // Try different endpoint patterns (prioritize documented endpoints)
    const endpointPatterns = [
      // Pattern 1: Primary documented endpoint for in-play odds
      // Endpoint: /v3/football/odds/inplay/fixtures/{fixtureId}
      {
        baseUrl: BASE_URL,
        path: `/odds/inplay/fixtures/${fixtureId}`,
        params: {
          include: optimizedInclude,
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.filters ? { filters: opts.filters } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 2: Include odds in fixture endpoint (alternative)
      // Endpoint: /v3/football/fixtures/{fixtureId}?include=odds.inPlay
      {
        baseUrl: BASE_URL,
        path: `/fixtures/${fixtureId}`,
        params: {
          include: `odds.inPlay;${optimizedInclude.split(";").map(inc => `odds.inPlay.${inc}`).join(";")}`,
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.filters ? { filters: opts.filters } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 3: Direct odds endpoint (odds base URL)
      {
        baseUrl: ODDS_BASE_URL,
        path: `/inplay/fixtures/${fixtureId}`,
        params: {
          include: optimizedInclude,
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.filters ? { filters: opts.filters } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
    ];
    
    const errors: Array<{ pattern: string; error: string }> = [];
    let lastError: Error | null = null;
    
    for (let i = 0; i < endpointPatterns.length; i++) {
      const pattern = endpointPatterns[i]!;
      const patternName = `${pattern.baseUrl}${pattern.path}`;
      
      try {
        const url = new URL(pattern.baseUrl + pattern.path);
        url.searchParams.set("api_token", token);
        
        // Add query parameters
        for (const [key, value] of Object.entries(pattern.params)) {
          if (value !== null && value !== undefined && value !== "") {
            url.searchParams.set(key, String(value));
          }
        }
        
        // Rate limiting: wait for token before making request
        await waitForRateLimit();
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
        
        try {
          console.log(`[getInplayOdds] Trying endpoint pattern ${i + 1}/${endpointPatterns.length} for fixture ${fixtureId}: ${patternName}`);
          
          const response = await fetch(url.toString(), {
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
            cache: "no-store",
          });
          
          clearTimeout(timeoutId);
          const body = await response.text();
          
          // Handle 429 rate limit errors with backoff
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            await waitForRetryAfter(retryAfter);
            await handle429Backoff(errors.length);
            // Retry this pattern
            i--; // Decrement to retry same pattern
            continue;
          }
          
          if (!response.ok) {
            const errorMsg = `HTTP ${response.status}: ${body.substring(0, 200)}`;
            errors.push({ pattern: patternName, error: errorMsg });
            
            if (response.status === 404) {
              // Try next pattern
              lastError = new Error(`SportMonks ${response.status}: ${body}`);
              console.log(`[getInplayOdds] Pattern ${i + 1} returned 404, trying next pattern...`);
              continue;
            }
            const sanitizedUrl = url.toString().replace(/api_token=[^&]*/, "api_token=***");
            console.error(`[getInplayOdds] API error for fixture ${fixtureId}:`, response.status, response.statusText, "- URL:", sanitizedUrl, "- Body:", body.substring(0, 500));
            throw new Error(`SportMonks ${response.status}: ${body}`);
          }
          
          const parsed = JSON.parse(body);
          
          // Debug: Log response structure
          console.log(`[getInplayOdds] Success for fixture ${fixtureId} using pattern ${i + 1}:`, {
            pattern: patternName,
            hasData: parsed && typeof parsed === "object" && "data" in parsed,
            isArray: Array.isArray(parsed),
            keys: parsed && typeof parsed === "object" ? Object.keys(parsed) : [],
            dataType: parsed?.data ? (Array.isArray(parsed.data) ? "array" : typeof parsed.data) : "none",
            dataKeys: parsed?.data && typeof parsed.data === "object" && !Array.isArray(parsed.data) ? Object.keys(parsed.data) : [],
            marketsInData: parsed?.data?.markets ? parsed.data.markets.length : parsed?.data?.odds?.inPlay?.markets ? parsed.data.odds.inPlay.markets.length : parsed?.data?.[0]?.markets ? parsed.data[0].markets.length : parsed?.markets ? parsed.markets.length : 0,
          });
          
          return parsed;
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === "AbortError") {
            const timeoutError = new Error(`SportMonks API request timeout after ${TIMEOUT_MS}ms`);
            errors.push({ pattern: patternName, error: timeoutError.message });
            throw timeoutError;
          }
          // If it's a 404, try next pattern
          if (error instanceof Error && error.message.includes("404")) {
            errors.push({ pattern: patternName, error: error.message });
            lastError = error;
            continue;
          }
          errors.push({ pattern: patternName, error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      } catch (error) {
        // Continue to next pattern
        if (error instanceof Error) {
          if (!errors.some(e => e.pattern === patternName)) {
            errors.push({ pattern: patternName, error: error.message });
          }
          lastError = error;
        }
        continue;
      }
    }
    
    // If all patterns failed, throw a detailed error
    const errorDetails = errors.map(e => `  - ${e.pattern}: ${e.error}`).join("\n");
    const finalError = new Error(
      `All ${endpointPatterns.length} endpoint patterns failed for inplay odds (fixture ${fixtureId}):\n${errorDetails}`
    );
    console.error(`[getInplayOdds] All patterns failed for fixture ${fixtureId}:`, errors);
    throw finalError;
  },

  /**
   * Fetch all pre-match odds
   * GET /v3/football/odds/pre-match
   * Include options: market, bookmaker, fixture
   * Query parameters: include, select, filters, locale, order, per_page, page
   */
  async getAllPrematchOdds(opts?: {
    include?: string;
    select?: string;
    filters?: string;
    locale?: string;
    order?: "asc" | "desc";
    per_page?: number;
    page?: number;
  }): Promise<unknown> {
    const token = mustToken();
    // Use BASE_URL + /odds/pre-match (not ODDS_BASE_URL) to match the documented endpoint
    const url = new URL(`${BASE_URL}/odds/pre-match`);
    url.searchParams.set("api_token", token);

    if (opts?.include) {
      url.searchParams.set("include", opts.include);
    } else {
      // Default includes: market, bookmaker, fixture
      url.searchParams.set("include", "market;bookmaker;fixture");
    }

    if (opts?.select) {
      url.searchParams.set("select", opts.select);
    }

    if (opts?.filters) {
      url.searchParams.set("filters", opts.filters);
    }

    if (opts?.locale) {
      url.searchParams.set("locale", opts.locale);
    }

    if (opts?.order) {
      url.searchParams.set("order", opts.order);
    }

    if (opts?.per_page !== undefined) {
      // Validate per_page (max 50)
      const perPage = Math.min(Math.max(1, opts.per_page), 50);
      url.searchParams.set("per_page", String(perPage));
    }

    if (opts?.page !== undefined) {
      url.searchParams.set("page", String(Math.max(1, opts.page)));
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
        const sanitizedUrl = url.toString().replace(/api_token=[^&]*/, "api_token=***");
        console.error(
          `[getAllPrematchOdds] ${response.status} ${response.statusText} - URL: ${sanitizedUrl} - Body: ${body}`
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
   * Fetch pre-match odds by fixture ID and bookmaker ID
   * GET /v3/football/odds/pre-match/fixtures/{fixtureId}/bookmakers/{bookmakerId}
   * Include options: market, bookmaker, fixture
   * Query parameters: include, select, filters, locale
   * Static filters: markets, winningOdds
   */
  async getPrematchOddsByFixtureAndBookmaker(
    fixtureId: number,
    bookmakerId: number,
    opts?: {
      include?: string;
      select?: string;
      filters?: string;
      locale?: string;
    }
  ): Promise<unknown> {
    const token = mustToken();
    
    // Try different endpoint patterns
    const endpointPatterns = [
      // Pattern 1: Primary documented endpoint
      // GET /v3/football/odds/pre-match/fixtures/{fixtureId}/bookmakers/{bookmakerId}
      {
        baseUrl: BASE_URL,
        path: `/odds/pre-match/fixtures/${fixtureId}/bookmakers/${bookmakerId}`,
        params: {
          include: opts?.include || "market;bookmaker;fixture",
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.filters ? { filters: opts.filters } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 2: Direct odds endpoint with bookmaker filter (fallback)
      {
        baseUrl: BASE_URL,
        path: `/odds/pre-match/fixtures/${fixtureId}`,
        params: {
          include: opts?.include || "market;bookmaker;fixture",
          filters: `bookmakers:${bookmakerId}${opts?.filters ? `;${opts.filters}` : ""}`,
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 3: Football endpoint with odds include and bookmaker filter (fallback)
      {
        baseUrl: BASE_URL,
        path: `/fixtures/${fixtureId}`,
        params: {
          include: opts?.include 
            ? `odds.preMatch;${opts.include.split(";").map(inc => `odds.preMatch.${inc}`).join(";")}`
            : "odds.preMatch;odds.preMatch.market;odds.preMatch.bookmaker",
          filters: `bookmakers:${bookmakerId}${opts?.filters ? `;${opts.filters}` : ""}`,
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
    ];

    const errors: Array<{ pattern: string; error: string }> = [];
    let lastError: Error | null = null;

    for (let i = 0; i < endpointPatterns.length; i++) {
      const pattern = endpointPatterns[i]!;
      const patternName = `${pattern.baseUrl}${pattern.path}`;

      try {
        const url = new URL(pattern.baseUrl + pattern.path);
        url.searchParams.set("api_token", token);

        for (const [key, value] of Object.entries(pattern.params)) {
          if (value !== null && value !== undefined && value !== "") {
            url.searchParams.set(key, String(value));
          }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const response = await fetch(url.toString(), {
            headers: { Accept: "application/json" },
            signal: controller.signal,
            cache: "no-store",
          });

          clearTimeout(timeoutId);
          const body = await response.text();

          if (!response.ok) {
            if (response.status === 404) {
              lastError = new Error(`SportMonks ${response.status}: ${body}`);
              continue;
            }
            throw new Error(`SportMonks ${response.status}: ${body}`);
          }

          return JSON.parse(body);
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === "AbortError") {
            throw new Error(`SportMonks API request timeout after ${TIMEOUT_MS}ms`);
          }
          if (error instanceof Error && error.message.includes("404")) {
            errors.push({ pattern: patternName, error: error.message });
            lastError = error;
            continue;
          }
          throw error;
        }
      } catch (error) {
        if (error instanceof Error) {
          errors.push({ pattern: patternName, error: error.message });
          lastError = error;
        }
        continue;
      }
    }

    const errorDetails = errors.map(e => `  - ${e.pattern}: ${e.error}`).join("\n");
    throw new Error(
      `All ${endpointPatterns.length} endpoint patterns failed for prematch odds (fixture ${fixtureId}, bookmaker ${bookmakerId}):\n${errorDetails}`
    );
  },

  /**
   * Fetch pre-match odds by fixture ID and market ID
   * GET /v3/football/odds/pre-match/fixtures/{fixtureId}/markets/{marketId}
   * Include options: market, bookmaker, fixture
   * Query parameters: include, select, filters, locale
   * Static filters: bookmakers, winningOdds
   */
  async getPrematchOddsByFixtureAndMarket(
    fixtureId: number,
    marketId: number,
    opts?: {
      include?: string;
      select?: string;
      filters?: string;
      locale?: string;
    }
  ): Promise<unknown> {
    const token = mustToken();
    
    // Try different endpoint patterns
    const endpointPatterns = [
      // Pattern 1: Primary documented endpoint
      // GET /v3/football/odds/pre-match/fixtures/{fixtureId}/markets/{marketId}
      {
        baseUrl: BASE_URL,
        path: `/odds/pre-match/fixtures/${fixtureId}/markets/${marketId}`,
        params: {
          include: opts?.include || "market;bookmaker;fixture",
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.filters ? { filters: opts.filters } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 2: Direct odds endpoint with market filter (fallback)
      {
        baseUrl: BASE_URL,
        path: `/odds/pre-match/fixtures/${fixtureId}`,
        params: {
          include: opts?.include || "market;bookmaker;fixture",
          filters: `markets:${marketId}${opts?.filters ? `;${opts.filters}` : ""}`,
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 3: Football endpoint with odds include and market filter (fallback)
      {
        baseUrl: BASE_URL,
        path: `/fixtures/${fixtureId}`,
        params: {
          include: opts?.include 
            ? `odds.preMatch;${opts.include.split(";").map(inc => `odds.preMatch.${inc}`).join(";")}`
            : "odds.preMatch;odds.preMatch.market;odds.preMatch.bookmaker",
          filters: `markets:${marketId}${opts?.filters ? `;${opts.filters}` : ""}`,
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
    ];

    const errors: Array<{ pattern: string; error: string }> = [];
    let lastError: Error | null = null;

    for (let i = 0; i < endpointPatterns.length; i++) {
      const pattern = endpointPatterns[i]!;
      const patternName = `${pattern.baseUrl}${pattern.path}`;

      try {
        const url = new URL(pattern.baseUrl + pattern.path);
        url.searchParams.set("api_token", token);

        for (const [key, value] of Object.entries(pattern.params)) {
          if (value !== null && value !== undefined && value !== "") {
            url.searchParams.set(key, String(value));
          }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const response = await fetch(url.toString(), {
            headers: { Accept: "application/json" },
            signal: controller.signal,
            cache: "no-store",
          });

          clearTimeout(timeoutId);
          const body = await response.text();

          if (!response.ok) {
            if (response.status === 404) {
              lastError = new Error(`SportMonks ${response.status}: ${body}`);
              continue;
            }
            throw new Error(`SportMonks ${response.status}: ${body}`);
          }

          return JSON.parse(body);
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === "AbortError") {
            throw new Error(`SportMonks API request timeout after ${TIMEOUT_MS}ms`);
          }
          if (error instanceof Error && error.message.includes("404")) {
            errors.push({ pattern: patternName, error: error.message });
            lastError = error;
            continue;
          }
          throw error;
        }
      } catch (error) {
        if (error instanceof Error) {
          errors.push({ pattern: patternName, error: error.message });
          lastError = error;
        }
        continue;
      }
    }

    const errorDetails = errors.map(e => `  - ${e.pattern}: ${e.error}`).join("\n");
    throw new Error(
      `All ${endpointPatterns.length} endpoint patterns failed for prematch odds (fixture ${fixtureId}, market ${marketId}):\n${errorDetails}`
    );
  },

  /**
   * Fetch latest updated pre-match odds
   * GET /v3/football/odds/pre-match/latest
   * Returns pre-match odds updated in the last 10 seconds
   * Include options: market, bookmaker, fixture
   * Query parameters: include, select, filters, locale
   * Static filters: bookmakers, winningOdds
   * 
   * Note: This endpoint returns odds that were updated in the last 10 seconds.
   * Poll every 10 seconds to match the fixed update window (360 calls per hour).
   * Empty array means no changes in the last 10 seconds.
   */
  async getPrematchOddsLatest(opts?: {
    include?: string;
    select?: string;
    filters?: string;
    locale?: string;
  }): Promise<unknown> {
    const token = mustToken();
    // Use BASE_URL + /odds/pre-match/latest (not ODDS_BASE_URL) to match the documented endpoint
    const url = new URL(`${BASE_URL}/odds/pre-match/latest`);
    url.searchParams.set("api_token", token);

    if (opts?.include) {
      url.searchParams.set("include", opts.include);
    } else {
      // Default includes: market, bookmaker, fixture
      url.searchParams.set("include", "market;bookmaker;fixture");
    }

    if (opts?.select) {
      url.searchParams.set("select", opts.select);
    }

    if (opts?.filters) {
      url.searchParams.set("filters", opts.filters);
    }

    if (opts?.locale) {
      url.searchParams.set("locale", opts.locale);
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
        const sanitizedUrl = url.toString().replace(/api_token=[^&]*/, "api_token=***");
        console.error(
          `[getPrematchOddsLatest] ${response.status} ${response.statusText} - URL: ${sanitizedUrl} - Body: ${body}`
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
   * Fetch all in-play odds
   * GET /v3/football/odds/inplay
   * Include options: market, bookmaker, fixture
   * Query parameters: include, select, filters, locale, order, per_page, page
   * 
   * Response format: Flat array of odds objects
   */
  async getAllInplayOdds(opts?: {
    include?: string;
    select?: string;
    filters?: string;
    locale?: string;
    order?: "asc" | "desc";
    per_page?: number;
    page?: number;
  }): Promise<unknown> {
    const token = mustToken();
    // Use BASE_URL + /odds/inplay (not ODDS_BASE_URL) to match the documented endpoint
    const url = new URL(`${BASE_URL}/odds/inplay`);
    url.searchParams.set("api_token", token);

    if (opts?.include) {
      url.searchParams.set("include", opts.include);
    } else {
      // Default includes: market, bookmaker, fixture
      url.searchParams.set("include", "markets:name;bookmakers:name");
    }

    if (opts?.select) {
      url.searchParams.set("select", opts.select);
    }

    if (opts?.filters) {
      url.searchParams.set("filters", opts.filters);
    }

    if (opts?.locale) {
      url.searchParams.set("locale", opts.locale);
    }

    if (opts?.order) {
      url.searchParams.set("order", opts.order);
    }

    if (opts?.per_page !== undefined) {
      // Validate per_page (max 50)
      const perPage = Math.min(Math.max(1, opts.per_page), 50);
      url.searchParams.set("per_page", String(perPage));
    }

    if (opts?.page) {
      url.searchParams.set("page", String(opts.page));
    }

    // Rate limiting: wait for token before making request
    await waitForRateLimit();

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
        const sanitizedUrl = url.toString().replace(/api_token=[^&]*/, "api_token=***");
        console.error(
          `[getAllInplayOdds] ${response.status} ${response.statusText} - URL: ${sanitizedUrl} - Body: ${body.substring(0, 500)}`
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
   * Fetch in-play odds by fixture ID and bookmaker ID
   * GET /v3/football/odds/inplay/fixtures/{fixtureId}/bookmakers/{bookmakerId}
   * Include options: market, bookmaker, fixture
   * Query parameters: include, select, filters, locale
   * Static filters: markets, winningOdds
   */
  async getInplayOddsByFixtureAndBookmaker(
    fixtureId: number,
    bookmakerId: number,
    opts?: {
      include?: string;
      select?: string;
      filters?: string;
      locale?: string;
    }
  ): Promise<unknown> {
    const token = mustToken();
    
    // Try different endpoint patterns
    const endpointPatterns = [
      // Pattern 1: Primary documented endpoint
      // GET /v3/football/odds/inplay/fixtures/{fixtureId}/bookmakers/{bookmakerId}
      {
        baseUrl: BASE_URL,
        path: `/odds/inplay/fixtures/${fixtureId}/bookmakers/${bookmakerId}`,
        params: {
          include: opts?.include || "markets:name;bookmakers:name",
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.filters ? { filters: opts.filters } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 2: Direct odds endpoint with bookmaker filter (fallback)
      {
        baseUrl: BASE_URL,
        path: `/odds/inplay/fixtures/${fixtureId}`,
        params: {
          include: opts?.include || "markets:name;bookmakers:name",
          filters: `bookmakers:${bookmakerId}${opts?.filters ? `;${opts.filters}` : ""}`,
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 3: Football endpoint with odds include and bookmaker filter (fallback)
      {
        baseUrl: BASE_URL,
        path: `/fixtures/${fixtureId}`,
        params: {
          include: opts?.include 
            ? `odds.inPlay;${opts.include.split(";").map(inc => `odds.inPlay.${inc}`).join(";")}`
            : "odds.inPlay;odds.inPlay.markets:name;odds.inPlay.bookmakers:name",
          filters: `bookmakers:${bookmakerId}${opts?.filters ? `;${opts.filters}` : ""}`,
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
    ];

    const errors: Array<{ pattern: string; error: string }> = [];
    let lastError: Error | null = null;

    for (let i = 0; i < endpointPatterns.length; i++) {
      const pattern = endpointPatterns[i]!;
      const patternName = `${pattern.baseUrl}${pattern.path}`;

      try {
        const url = new URL(pattern.baseUrl + pattern.path);
        url.searchParams.set("api_token", token);

        for (const [key, value] of Object.entries(pattern.params)) {
          if (value !== null && value !== undefined && value !== "") {
            url.searchParams.set(key, String(value));
          }
        }

        // Rate limiting: wait for token before making request
        await waitForRateLimit();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const response = await fetch(url.toString(), {
            headers: { Accept: "application/json" },
            signal: controller.signal,
            cache: "no-store",
          });

          clearTimeout(timeoutId);
          const body = await response.text();

          if (!response.ok) {
            if (response.status === 404) {
              lastError = new Error(`SportMonks ${response.status}: ${body}`);
              continue;
            }
            throw new Error(`SportMonks ${response.status}: ${body}`);
          }

          return JSON.parse(body);
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === "AbortError") {
            throw new Error(`SportMonks API request timeout after ${TIMEOUT_MS}ms`);
          }
          if (error instanceof Error && error.message.includes("404")) {
            errors.push({ pattern: patternName, error: error.message });
            lastError = error;
            continue;
          }
          throw error;
        }
      } catch (error) {
        if (error instanceof Error) {
          errors.push({ pattern: patternName, error: error.message });
          lastError = error;
        }
        continue;
      }
    }

    const errorDetails = errors.map(e => `  - ${e.pattern}: ${e.error}`).join("\n");
    throw new Error(
      `All ${endpointPatterns.length} endpoint patterns failed for inplay odds (fixture ${fixtureId}, bookmaker ${bookmakerId}):\n${errorDetails}`
    );
  },

  /**
   * Fetch in-play odds by fixture ID and market ID
   * GET /v3/football/odds/inplay/fixtures/{fixtureId}/markets/{marketId}
   * Include options: market, bookmaker, fixture
   * Query parameters: include, select, filters, locale
   * Static filters: bookmakers, winningOdds
   */
  async getInplayOddsByFixtureAndMarket(
    fixtureId: number,
    marketId: number,
    opts?: {
      include?: string;
      select?: string;
      filters?: string;
      locale?: string;
    }
  ): Promise<unknown> {
    const token = mustToken();
    
    // Try different endpoint patterns
    const endpointPatterns = [
      // Pattern 1: Primary documented endpoint
      // GET /v3/football/odds/inplay/fixtures/{fixtureId}/markets/{marketId}
      {
        baseUrl: BASE_URL,
        path: `/odds/inplay/fixtures/${fixtureId}/markets/${marketId}`,
        params: {
          include: opts?.include || "markets:name;bookmakers:name",
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.filters ? { filters: opts.filters } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 2: Direct odds endpoint with market filter (fallback)
      {
        baseUrl: BASE_URL,
        path: `/odds/inplay/fixtures/${fixtureId}`,
        params: {
          include: opts?.include || "markets:name;bookmakers:name",
          filters: `markets:${marketId}${opts?.filters ? `;${opts.filters}` : ""}`,
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
      // Pattern 3: Football endpoint with odds include and market filter (fallback)
      {
        baseUrl: BASE_URL,
        path: `/fixtures/${fixtureId}`,
        params: {
          include: opts?.include 
            ? `odds.inPlay;${opts.include.split(";").map(inc => `odds.inPlay.${inc}`).join(";")}`
            : "odds.inPlay;odds.inPlay.markets:name;odds.inPlay.bookmakers:name",
          filters: `markets:${marketId}${opts?.filters ? `;${opts.filters}` : ""}`,
          ...(opts?.select ? { select: opts.select } : {}),
          ...(opts?.locale ? { locale: opts.locale } : {}),
        },
      },
    ];

    const errors: Array<{ pattern: string; error: string }> = [];
    let lastError: Error | null = null;

    for (let i = 0; i < endpointPatterns.length; i++) {
      const pattern = endpointPatterns[i]!;
      const patternName = `${pattern.baseUrl}${pattern.path}`;

      try {
        const url = new URL(pattern.baseUrl + pattern.path);
        url.searchParams.set("api_token", token);

        for (const [key, value] of Object.entries(pattern.params)) {
          if (value !== null && value !== undefined && value !== "") {
            url.searchParams.set(key, String(value));
          }
        }

        // Rate limiting: wait for token before making request
        await waitForRateLimit();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
          const response = await fetch(url.toString(), {
            headers: { Accept: "application/json" },
            signal: controller.signal,
            cache: "no-store",
          });

          clearTimeout(timeoutId);
          const body = await response.text();

          if (!response.ok) {
            if (response.status === 404) {
              lastError = new Error(`SportMonks ${response.status}: ${body}`);
              continue;
            }
            throw new Error(`SportMonks ${response.status}: ${body}`);
          }

          return JSON.parse(body);
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === "AbortError") {
            throw new Error(`SportMonks API request timeout after ${TIMEOUT_MS}ms`);
          }
          if (error instanceof Error && error.message.includes("404")) {
            errors.push({ pattern: patternName, error: error.message });
            lastError = error;
            continue;
          }
          throw error;
        }
      } catch (error) {
        if (error instanceof Error) {
          errors.push({ pattern: patternName, error: error.message });
          lastError = error;
        }
        continue;
      }
    }

    const errorDetails = errors.map(e => `  - ${e.pattern}: ${e.error}`).join("\n");
    throw new Error(
      `All ${endpointPatterns.length} endpoint patterns failed for inplay odds (fixture ${fixtureId}, market ${marketId}):\n${errorDetails}`
    );
  },

  /**
   * Fetch latest updated in-play odds
   * GET /v3/football/odds/inplay/latest
   * Returns in-play odds updated in the last 10 seconds
   * Include options: market, bookmaker, fixture
   * Query parameters: include, select, filters, locale
   * Static filters: bookmakers, winningOdds
   * 
   * Note: This endpoint returns odds that were updated in the last 10 seconds.
   * Poll every 10 seconds to match the fixed update window (360 calls per hour).
   * Empty array means no changes in the last 10 seconds.
   */
  async getInplayOddsLatest(opts?: {
    include?: string;
    select?: string;
    filters?: string;
    locale?: string;
  }): Promise<unknown> {
    const token = mustToken();
    // Use BASE_URL + /odds/inplay/latest (not ODDS_BASE_URL) to match the documented endpoint
    const url = new URL(`${BASE_URL}/odds/inplay/latest`);
    url.searchParams.set("api_token", token);

    if (opts?.include) {
      url.searchParams.set("include", opts.include);
    } else {
      // Default includes: market, bookmaker, fixture
      url.searchParams.set("include", "markets:name;bookmakers:name");
    }

    if (opts?.select) {
      url.searchParams.set("select", opts.select);
    }

    if (opts?.filters) {
      url.searchParams.set("filters", opts.filters);
    }

    if (opts?.locale) {
      url.searchParams.set("locale", opts.locale);
    }

    // Rate limiting: wait for token before making request
    await waitForRateLimit();

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
        const sanitizedUrl = url.toString().replace(/api_token=[^&]*/, "api_token=***");
        console.error(
          `[getInplayOddsLatest] ${response.status} ${response.statusText} - URL: ${sanitizedUrl} - Body: ${body.substring(0, 500)}`
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
};
