import "server-only";
import type {
  CountryDTO,
  FixtureDTO,
  LeagueDTO,
  LiveFixtureDTO,
  OddsDTO,
  RoundDTO,
  SeasonDTO,
  StageDTO,
} from "@repo/shared/types";
import { marketsWhitelist, bookmakerConfig, bet365LikeMarketDisplay } from "@repo/shared/constants";
import { getCachedLeague } from "./referenceCache";

// Debug: Log market display config on import
if (typeof window === "undefined") {
  // Server-side only
  console.log("[dto.ts] bet365LikeMarketDisplay loaded:", {
    count: bet365LikeMarketDisplay.length,
    firstFew: bet365LikeMarketDisplay.slice(0, 5).map(m => ({ id: m.marketId, name: m.devName })),
  });
}
import type { MarketDisplayConfig } from "@repo/shared/constants";
import type {
  SportMonksCountry,
  SportMonksFixture,
  SportMonksLeague,
  SportMonksOdds,
  SportMonksRound,
  SportMonksSeason,
  SportMonksStage,
} from "./schemas.js";

/**
 * DTO normalization functions for SportMonks API responses
 * Transforms raw SportMonks responses to our DTOs
 */

/**
 * Normalize SportMonks country to CountryDTO
 */
export function normalizeCountry(country: SportMonksCountry): CountryDTO {
  return {
    countryId: country.id,
    name: country.name,
    code: country.code,
    continentId: country.continent_id,
    flagUrl: country.image_path,
  };
}

/**
 * Normalize SportMonks league to LeagueDTO
 */
export function normalizeLeague(league: SportMonksLeague): LeagueDTO {
  return {
    leagueId: league.id,
    name: league.name,
    country: league.country?.name,
    countryId: league.country_id,
    type: league.type,
    logo: league.image_path,
    logoUrl: league.image_path,
  };
}

/**
 * Normalize SportMonks season to SeasonDTO
 */
export function normalizeSeason(season: SportMonksSeason): SeasonDTO {
  return {
    seasonId: season.id,
    name: season.name || `Season ${season.id}`,
    leagueId: season.league_id || 0,
    startDate: season.starting_at,
    endDate: season.ending_at,
  };
}

/**
 * Normalize SportMonks stage to StageDTO
 */
export function normalizeStage(stage: SportMonksStage): StageDTO {
  return {
    stageId: stage.id,
    name: stage.name,
    seasonId: stage.season_id || 0,
    type: stage.type,
  };
}

/**
 * Normalize SportMonks round to RoundDTO
 */
export function normalizeRound(round: SportMonksRound): RoundDTO {
  return {
    roundId: round.id,
    name: round.name,
    stageId: round.stage_id || 0,
    startingAt: round.starting_at,
  };
}

/**
 * Check if a fixture is finished based on state
 * SportMonks states: NS (Not Started), LIVE, LIVE-HT, HT, FT (Full Time), FT_PEN, CANCL, POSTP, INT, ABAN, SUSP, AWARDED, DELAYED
 */
function isFixtureFinished(state?: string | null): boolean {
  if (!state) return false;
  const finishedStates = ["FT", "FT_PEN", "CANCL", "POSTP", "INT", "ABAN", "SUSP", "AWARDED"];
  return finishedStates.includes(state.toUpperCase());
}

/**
 * Check if a fixture has started (including live and finished)
 */
function isFixtureStarted(state?: string | null): boolean {
  if (!state) return false;
  const startedStates = ["LIVE", "LIVE-HT", "HT", "FT", "FT_PEN", "INT", "ABAN", "SUSP", "AWARDED"];
  return startedStates.includes(state.toUpperCase());
}

/**
 * Normalize SportMonks fixture to FixtureDTO
 */
export function normalizeFixture(fixture: SportMonksFixture): FixtureDTO {
  const participants = fixture.participants || [];
  const homeParticipant = participants.find((p) => p.meta?.location === "home") || participants[0];
  const awayParticipant = participants.find((p) => p.meta?.location === "away") || participants[1];
  
  const homeTeam = homeParticipant?.name || "";
  const awayTeam = awayParticipant?.name || "";
  
  // Extract team logos from participants
  const homeTeamLogo = (homeParticipant as { image_path?: string | null })?.image_path || null;
  const awayTeamLogo = (awayParticipant as { image_path?: string | null })?.image_path || null;

  // Extract state: can be string (state name) or object (state include)
  let state: string | null = null;
  if (typeof fixture.state === "string") {
    state = fixture.state;
  } else if (fixture.state && typeof fixture.state === "object") {
    // If state is included as object, extract name
    const stateObj = fixture.state as { name?: string; name_en?: string };
    state = stateObj.name || stateObj.name_en || null;
  }
  
  // Normalize state names to standard codes
  // SportMonks can return "Full Time", "Full-time", "FT", etc.
  if (state) {
    const stateUpper = state.toUpperCase().trim();
    // Map common state names to standard codes
    if (stateUpper.includes("FULL TIME") || stateUpper.includes("FULL-TIME")) {
      state = "FT";
    } else if (stateUpper.includes("HALF TIME") || stateUpper.includes("HALF-TIME")) {
      state = "HT";
    } else if (stateUpper.includes("NOT STARTED") || stateUpper === "NS") {
      state = "NS";
    } else if (stateUpper.includes("LIVE")) {
      state = "LIVE";
    } else if (stateUpper.includes("CANCELLED") || stateUpper === "CANCL") {
      state = "CANCL";
    } else if (stateUpper.includes("POSTPONED") || stateUpper === "POSTP") {
      state = "POSTP";
    } else if (stateUpper.includes("INTERRUPTED") || stateUpper === "INT") {
      state = "INT";
    } else if (stateUpper.includes("ABANDONED") || stateUpper === "ABAN") {
      state = "ABAN";
    } else if (stateUpper.includes("SUSPENDED") || stateUpper === "SUSP") {
      state = "SUSP";
    } else if (stateUpper.includes("AWARDED")) {
      state = "AWARDED";
    } else if (stateUpper.includes("PENALTIES") || stateUpper === "FT_PEN") {
      state = "FT_PEN";
    }
    // Keep original if it's already a standard code (FT, HT, LIVE, etc.)
  }
  
  // If state is still null, try to infer from state_id
  if (!state) {
    const stateId = (fixture as unknown as { state_id?: number })?.state_id;
    if (stateId) {
      // State ID mapping: Common state IDs in SportMonks
      // 1=NS (Not Started), 2=LIVE, 3=HT (Half Time), 4=FT (Full Time), 
      // 5=FT_PEN (Full Time Penalties), 6=CANCL (Cancelled), 7=POSTP (Postponed),
      // 8=INT (Interrupted), 9=ABAN (Abandoned), 10=SUSP (Suspended), 11=AWARDED
      const stateIdMap: Record<number, string> = {
        1: "NS",
        2: "LIVE",
        3: "HT",
        4: "FT",
        5: "FT_PEN",
        6: "CANCL",
        7: "POSTP",
        8: "INT",
        9: "ABAN",
        10: "SUSP",
        11: "AWARDED",
      };
      state = stateIdMap[stateId] || null;
    }
  }
  
  // If state is still null and we have scores, likely the match is finished
  // Also check if starting_at is in the past (more than 2 hours ago, accounting for match duration)
  if (!state && fixture.scores) {
    const kickoffAt = fixture.starting_at;
    if (kickoffAt) {
      const kickoffTime = new Date(kickoffAt);
      const now = new Date();
      const matchDuration = (fixture as unknown as { length?: number })?.length || 90; // Default 90 minutes
      const matchEndTime = new Date(kickoffTime.getTime() + (matchDuration + 30) * 60 * 1000); // Add 30 min for extra time
      
      // If match end time is more than 1 hour ago, consider it finished
      if (now.getTime() > matchEndTime.getTime() + 60 * 60 * 1000) {
        state = "FT"; // Assume finished
      }
    } else {
      // Handle scores as both object and array
      let scoresObj: { home_score?: number; away_score?: number } | null = null;
      if (Array.isArray(fixture.scores)) {
        scoresObj = fixture.scores[0] as { home_score?: number; away_score?: number } | null;
      } else if (typeof fixture.scores === "object") {
        scoresObj = fixture.scores as { home_score?: number; away_score?: number };
      }
      
      if (scoresObj && scoresObj.home_score !== undefined && scoresObj.away_score !== undefined) {
        // If we have scores but no state, likely finished
        state = "FT";
      }
    }
  }
  
  const stateStr = state || "";
  const isLive = stateStr === "LIVE" || stateStr === "LIVE-HT";
  
  // Check if fixture is finished based on state
  let isFinished = isFixtureFinished(stateStr);
  
  // If state doesn't indicate finished, check by kickoff time
  // A match is considered finished if:
  // 1. State explicitly says FT, FT_PEN, etc. (already checked above)
  // 2. OR kickoff time is in the past AND match duration has passed (90+ minutes)
  if (!isFinished && fixture.starting_at) {
    try {
      const kickoffTime = new Date(fixture.starting_at);
      const now = new Date();
      const matchDuration = (fixture as unknown as { length?: number })?.length || 90; // Default 90 minutes
      const matchEndTime = new Date(kickoffTime.getTime() + (matchDuration + 30) * 60 * 1000); // Add 30 min for extra time
      
      // If match end time is in the past, consider it finished
      if (now.getTime() > matchEndTime.getTime()) {
        isFinished = true;
      }
    } catch {
      // Ignore date parsing errors
    }
  }
  
  const isStarted = isFixtureStarted(stateStr);
  
  // Handle scores as both object and array
  // For live fixtures, scores array contains multiple score objects (one per period)
  // For finished fixtures, we need to find the final score (usually the last one in the array)
  let score: { home: number; away: number } | undefined = undefined;
  if (fixture.scores) {
    if (Array.isArray(fixture.scores)) {
      // If scores is an array, find the final score
      // For finished matches, look for the score with the highest minute or the last one
      // Scores array is typically ordered chronologically
      let finalScore: { 
        home_score?: number; 
        away_score?: number; 
        score?: string;
        minute?: number;
        [key: string]: unknown;
      } | null = null;
      
      // Try to find the score with the highest minute (final score)
      let maxMinute = -1;
      for (const scoreItem of fixture.scores) {
        if (scoreItem && typeof scoreItem === "object") {
          const scoreObj = scoreItem as { 
            home_score?: number; 
            away_score?: number; 
            score?: string;
            minute?: number;
            [key: string]: unknown;
          };
          
          // Check if this score has actual values (not 0-0 or null)
          const hasValidScore = (
            (scoreObj.home_score !== undefined && scoreObj.home_score !== null) ||
            (scoreObj.away_score !== undefined && scoreObj.away_score !== null) ||
            scoreObj.score
          );
          
          const minute = scoreObj.minute ?? 999; // If no minute, assume it's the final score
          if (minute > maxMinute && hasValidScore) {
            maxMinute = minute;
            finalScore = scoreObj;
          }
        }
      }
      
      // If no score found by minute, use the last one with valid score
      if (!finalScore && fixture.scores.length > 0) {
        // Try from the end to find the last valid score
        for (let i = fixture.scores.length - 1; i >= 0; i--) {
          const scoreItem = fixture.scores[i];
          if (scoreItem && typeof scoreItem === "object") {
            const scoreObj = scoreItem as { 
              home_score?: number; 
              away_score?: number; 
              score?: string;
              [key: string]: unknown;
            };
            const hasValidScore = (
              (scoreObj.home_score !== undefined && scoreObj.home_score !== null) ||
              (scoreObj.away_score !== undefined && scoreObj.away_score !== null) ||
              scoreObj.score
            );
            if (hasValidScore) {
              finalScore = scoreObj;
              break;
            }
          }
        }
      }
      
      if (finalScore) {
        // Try to extract from score string if available (e.g., "2-1")
        if (finalScore.score && typeof finalScore.score === "string") {
          const scoreMatch = finalScore.score.match(/(\d+)[\s-:]+(\d+)/);
          if (scoreMatch) {
            const homeScore = parseInt(scoreMatch[1]!, 10);
            const awayScore = parseInt(scoreMatch[2]!, 10);
            if (!isNaN(homeScore) && !isNaN(awayScore)) {
              score = { home: homeScore, away: awayScore };
            }
          }
        }
        
        // If not extracted from string, use numeric values
        if (!score && finalScore.home_score !== undefined && finalScore.away_score !== undefined) {
          // Only use if at least one score is non-zero (to avoid 0-0 placeholders)
          if (finalScore.home_score > 0 || finalScore.away_score > 0) {
            score = {
              home: finalScore.home_score ?? 0,
              away: finalScore.away_score ?? 0,
            };
          }
        }
      }
    } else if (typeof fixture.scores === "object") {
      // If scores is an object, use it directly
      const scoreObj = fixture.scores as { 
        home_score?: number; 
        away_score?: number;
        score?: string;
        [key: string]: unknown;
      };
      
      // Try to extract from score string if available
      if (scoreObj.score && typeof scoreObj.score === "string") {
        const scoreMatch = scoreObj.score.match(/(\d+)[\s-:]+(\d+)/);
        if (scoreMatch) {
          const homeScore = parseInt(scoreMatch[1]!, 10);
          const awayScore = parseInt(scoreMatch[2]!, 10);
          if (!isNaN(homeScore) && !isNaN(awayScore)) {
            score = { home: homeScore, away: awayScore };
          }
        }
      }
      
      // If not extracted from string, use numeric values
      if (!score && scoreObj.home_score !== undefined && scoreObj.away_score !== undefined) {
        // Only use if at least one score is non-zero
        if (scoreObj.home_score > 0 || scoreObj.away_score > 0) {
          score = {
            home: scoreObj.home_score ?? 0,
            away: scoreObj.away_score ?? 0,
          };
        }
      }
    }
  }
  
  // For finished fixtures, try multiple sources for score:
  // 1. scores array (final score with highest minute)
  // 2. participants.meta.score (if available)
  // 3. result_info parsing (fallback)
  
  // Priority 1: Check participants.meta.score (most reliable for finished matches)
  if (isFinished && !score) {
    const homeMeta = homeParticipant?.meta as { score?: number; winner?: boolean } | undefined;
    const awayMeta = awayParticipant?.meta as { score?: number; winner?: boolean } | undefined;
    
    // Some APIs return score in meta
    if (homeMeta?.score !== undefined && awayMeta?.score !== undefined) {
      score = {
        home: homeMeta.score,
        away: awayMeta.score,
      };
      console.log("[normalizeFixture] Using score from participants.meta:", score);
    }
  }
  
  // Priority 2: Try to parse result_info if it contains score (e.g., "Celtic won 2-1")
  if (isFinished && !score) {
    const resultInfo = (fixture as unknown as { result_info?: string })?.result_info;
    if (resultInfo) {
      // Try to extract score from result_info (e.g., "2-1", "won 2-1", etc.)
      const scoreMatch = resultInfo.match(/(\d+)[\s-]+(\d+)/);
      if (scoreMatch) {
        const homeScore = parseInt(scoreMatch[1]!, 10);
        const awayScore = parseInt(scoreMatch[2]!, 10);
        if (!isNaN(homeScore) && !isNaN(awayScore)) {
          score = { home: homeScore, away: awayScore };
          console.log("[normalizeFixture] Parsed score from result_info:", score, "from:", resultInfo);
        }
      }
    }
  }
  
  // Debug: Log scores for finished fixtures to verify structure
  if (isFinished) {
    console.log("[normalizeFixture] Finished fixture score extraction:", {
      fixtureId: fixture.id,
      state: stateStr,
      scoresRaw: fixture.scores,
      extractedScore: score,
      result_info: (fixture as unknown as { result_info?: string })?.result_info,
      participantsMeta: {
        home: homeParticipant?.meta,
        away: awayParticipant?.meta,
      },
    });
  }

  // Extract minute from fixture (for live matches)
  const minute = (fixture as unknown as { minute?: number | null })?.minute ?? null;

  // Extract league info from fixture (if included)
  // Try to get from cache first, then from included data, then from league_id
  const leagueId = (fixture as unknown as { league_id?: number })?.league_id;
  let leagueName: string | undefined;
  
  // First try included league data
  const includedLeague = (fixture as unknown as { league?: { name?: string } })?.league;
  if (includedLeague?.name) {
    leagueName = includedLeague.name;
  } else if (leagueId) {
    // Try cache if league not included (optional, non-blocking)
    try {
      const cachedLeague = getCachedLeague(leagueId);
      if (cachedLeague?.name) {
        leagueName = cachedLeague.name;
      }
    } catch {
      // Cache not available, ignore
    }
  }

  const kickoffAt = fixture.starting_at || new Date().toISOString();

  // Extract has_odds from fixture (if available)
  const hasOdds = (fixture as unknown as { has_odds?: boolean | null })?.has_odds ?? undefined;

  // Only mark as finished if state explicitly indicates it (FT, FT_PEN, CANCL, etc.)
  // Don't mark as finished based on kickoff time - rely only on state
  // This allows pre-match betting for upcoming fixtures even if kickoff time is close

  return {
    fixtureId: fixture.id,
    teams: {
      home: homeTeam,
      away: awayTeam,
    },
    homeTeam,
    awayTeam,
    kickoffAt,
    leagueId,
    leagueName,
    isLive,
    isFinished: isFinished, // Only based on state, not time
    isStarted,
    hasOdds, // Use has_odds from API if available
    score,
    minute,
    homeTeamLogo,
    awayTeamLogo,
    state: stateStr || null, // Include state in response
  };
}

function findMarketConfig(marketId: number): MarketDisplayConfig | undefined {
  const config = bet365LikeMarketDisplay.find((m) => m.marketId === marketId);
  if (!config && marketId <= 10) {
    // Debug: Log missing config for common markets
    console.warn("[findMarketConfig] No config found for market ID:", marketId, "Available IDs:", bet365LikeMarketDisplay.slice(0, 10).map(m => m.marketId));
  }
  return config;
}

function normalizeSelectionKey(template: string, selectionName: string): string {
  const sel = selectionName.toLowerCase().trim();
  if (template === "ou") {
    if (sel.includes("over")) return "Over";
    if (sel.includes("under")) return "Under";
  }
  if (template === "yesno") {
    if (sel === "yes" || sel === "y") return "Yes";
    if (sel === "no" || sel === "n") return "No";
  }
  if (template === "1x2" || template === "handicap_3way" || template === "htft") {
    // Support multiple formats: "1", "Home", "home", "1 (Home)", etc.
    if (sel === "1" || sel.includes("home") || sel.startsWith("1")) return "1";
    if (sel === "x" || sel === "draw" || sel.includes("draw")) return "X";
    if (sel === "2" || sel.includes("away") || sel.startsWith("2")) return "2";
  }
  if (template === "2way" || template === "handicap_2way") {
    if (sel === "1" || sel.includes("home") || sel.startsWith("1")) return "Home";
    if (sel === "2" || sel.includes("away") || sel.startsWith("2")) return "Away";
  }
  // Return original if no match (fallback)
  return selectionName;
}

function parseLine(value?: string | null): number | string | null {
  if (!value) return null;
  const numMatch = value.match(/-?\d+(\.\d+)?/);
  if (numMatch) {
    const parsed = Number(numMatch[0]);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}

function buildMarketKey(cfg: MarketDisplayConfig, line: number | string | null): string {
  // backward compatibility for existing widgets
  if (cfg.marketId === 1) return "1X2";
  if (cfg.marketId === 14) return "BTTS";
  if (cfg.template === "ou" && typeof line === "number") {
    return `OU${line}`;
  }
  return cfg.devName || cfg.label || `market_${cfg.marketId}`;
}

/**
 * Get selected bookmaker ID from config
 */
function getSelectedBookmakerId(): string | number | null {
  const config = bookmakerConfig.find((c) => c.id === "sportmonks");
  return config?.selectedBookmakerId || null;
}

/**
 * Transform odds array format to SportMonksOdds format
 * Converts: { data: { odds: [{ market_id, label, value, ... }] } }
 * To: { fixture_id, markets: [{ id, selections: [...] }] }
 * Includes all pre-match and in-play odds fields: probability, dp3, fractional, american, winning, stopped, suspended, etc.
 */
export function transformOddsArrayToMarketsFormat(
  fixtureId: number,
  oddsArray: Array<{
    id?: number;
    market_id: number;
    label: string;
    value: string;
    name?: string;
    sort_order?: number | null; // Sort order for selections
    total?: string | null;
    handicap?: string | null;
    market_description?: string | null;
    probability?: string | null;
    dp3?: string | null;
    fractional?: string | null;
    american?: string | null;
    winning?: boolean | null;
    stopped?: boolean | null;
    suspended?: boolean | null; // In-play odds specific field
    participants?: string | null;
    latest_bookmaker_update?: string | null;
    [key: string]: unknown;
  }>
): SportMonksOdds {
  // Group odds by market_id
  const marketsMap = new Map<
    number,
    {
      id: number;
      name: string;
      market_description?: string | null;
      selections: Array<{
        id: number;
        name: string;
        odds: number;
        value?: string;
        label?: string | null;
        sort_order?: number | null; // Sort order for selections
        market_description?: string | null;
        probability?: string | null;
        dp3?: string | null;
        fractional?: string | null;
        american?: string | null;
        winning?: boolean | null;
        stopped?: boolean | null;
        suspended?: boolean | null; // In-play odds specific field
        total?: string | null;
        handicap?: string | null;
        participants?: string | null;
        latest_bookmaker_update?: string | null;
      }>;
    }
  >();

  let selectionIdCounter = 1;

  for (const oddsItem of oddsArray) {
    const marketId = oddsItem.market_id;
    const oddsValue = parseFloat(oddsItem.value);
    
    if (isNaN(oddsValue) || oddsValue <= 0) {
      continue;
    }

    const selectionName = oddsItem.label || oddsItem.name || "";
    if (!selectionName) {
      continue; // Skip if no name
    }

    if (!marketsMap.has(marketId)) {
      // Get market name from first item's market_description if available
      const marketDescription = oddsItem.market_description;
      marketsMap.set(marketId, {
        id: marketId,
        name: marketDescription || `Market ${marketId}`,
        market_description: marketDescription || null,
        selections: [],
      });
    }

    const market = marketsMap.get(marketId)!;
    
    // Build value from total or handicap
    const lineValue = oddsItem.total || oddsItem.handicap;
    
    // Include all available fields from the odds item
    market.selections.push({
      id: oddsItem.id || selectionIdCounter++,
      name: selectionName,
      odds: oddsValue,
      ...(lineValue ? { value: String(lineValue) } : {}),
      ...(oddsItem.label ? { label: oddsItem.label } : {}),
      ...(oddsItem.sort_order !== undefined && oddsItem.sort_order !== null ? { sort_order: oddsItem.sort_order } : {}),
      ...(oddsItem.market_description ? { market_description: oddsItem.market_description } : {}),
      ...(oddsItem.probability ? { probability: oddsItem.probability } : {}),
      ...(oddsItem.dp3 ? { dp3: oddsItem.dp3 } : {}),
      ...(oddsItem.fractional ? { fractional: oddsItem.fractional } : {}),
      ...(oddsItem.american ? { american: oddsItem.american } : {}),
      ...(oddsItem.winning !== undefined ? { winning: oddsItem.winning } : {}),
      ...(oddsItem.stopped !== undefined ? { stopped: oddsItem.stopped } : {}),
      ...(oddsItem.suspended !== undefined ? { suspended: oddsItem.suspended } : {}),
      ...(oddsItem.total ? { total: oddsItem.total } : {}),
      ...(oddsItem.handicap ? { handicap: oddsItem.handicap } : {}),
      ...(oddsItem.participants ? { participants: oddsItem.participants } : {}),
      ...(oddsItem.latest_bookmaker_update ? { latest_bookmaker_update: oddsItem.latest_bookmaker_update } : {}),
    });
  }

  return {
    id: fixtureId,
    fixture_id: fixtureId,
    markets: Array.from(marketsMap.values()),
  };
}

/**
 * Normalize SportMonks odds to OddsDTO
 */
export function normalizeOdds(odds: SportMonksOdds): OddsDTO {
  const fixtureId = odds.fixture_id;
  const markets: OddsDTO["markets"] = [];

  const oddsMarkets = odds.markets || [];
  console.log("[normalizeOdds] Processing", oddsMarkets.length, "markets for fixture", fixtureId);
  
  for (const market of oddsMarkets) {
    const cfg = findMarketConfig(market.id);
    
    // Debug: Log all markets (both with and without config)
    if (oddsMarkets.length <= 20) {
      if (cfg) {
        console.log("[normalizeOdds] Processing market (with config):", {
          id: market.id,
          name: market.name || market.market,
          config: { marketId: cfg.marketId, devName: cfg.devName, template: cfg.template, group: cfg.group },
          selectionsCount: market.selections?.length || 0,
        });
      } else {
        console.log("[normalizeOdds] Processing market (no config, using fallback):", {
          id: market.id,
          name: market.name || market.market,
          selectionsCount: market.selections?.length || 0,
        });
      }
    }
    
    // Use fallback config if not found in bet365LikeMarketDisplay
    const fallbackConfig: MarketDisplayConfig = cfg || {
      marketId: market.id,
      devName: market.name || market.market || `MARKET_${market.id}`,
      label: market.name || market.market || `Market ${market.id}`,
      template: "list", // Default template for unknown markets
      group: "Other",
    };

    // Process selections
    const selections = market.selections || [];
    for (const selection of selections) {
      if (!selection.odds || selection.odds <= 0) {
        continue;
      }

      const selectionRaw = selection.name || selection.value || "";
      const line = parseLine(selection.value || selection.name);
      const selectionKey = normalizeSelectionKey(fallbackConfig.template, selectionRaw);
      const marketKey = buildMarketKey(fallbackConfig, line);

      markets.push({
        market: marketKey,
        selection: selectionKey,
        odds: selection.odds,
        marketId: market.id,
        devName: fallbackConfig.devName,
        label: fallbackConfig.label,
        template: fallbackConfig.template,
        line,
        selectionRaw,
        group: fallbackConfig.group,
        // Include additional SportMonks pre-match odds fields
        marketDescription: selection.market_description || market.market_description || null,
        probability: selection.probability || null,
        dp3: selection.dp3 || null,
        fractional: selection.fractional || null,
        american: selection.american || null,
        winning: selection.winning ?? null,
        stopped: selection.stopped ?? null,
        suspended: selection.suspended ?? null, // In-play odds specific field
        total: selection.total || null,
        handicap: selection.handicap || null,
        participants: selection.participants || null,
        latestBookmakerUpdate: selection.latest_bookmaker_update || null,
        bookmakerId: odds.bookmaker_id || undefined,
      });
    }
  }
  
  // Debug: Log summary
  console.log("[normalizeOdds] Summary:", {
    totalMarketsFromAPI: oddsMarkets.length,
    totalMarketsProcessed: markets.length,
    uniqueMarketIds: [...new Set(markets.map(m => m.marketId))].length,
    marketsByGroup: Array.from(
      markets.reduce((acc, m) => {
        const group = m.group || "Other";
        acc.set(group, (acc.get(group) || 0) + 1);
        return acc;
      }, new Map<string, number>())
    ).map(([group, count]) => ({ group, count })),
  });

  return {
    fixtureId,
    markets,
  };
}

/**
 * Normalize array of SportMonks responses
 */
export function normalizeCountries(
  countries: SportMonksCountry[]
): CountryDTO[] {
  return countries.map(normalizeCountry);
}

export function normalizeLeagues(leagues: SportMonksLeague[]): LeagueDTO[] {
  return leagues.map(normalizeLeague);
}

export function normalizeSeasons(seasons: SportMonksSeason[]): SeasonDTO[] {
  return seasons.map(normalizeSeason);
}

export function normalizeStages(stages: SportMonksStage[]): StageDTO[] {
  return stages.map(normalizeStage);
}

export function normalizeRounds(rounds: SportMonksRound[]): RoundDTO[] {
  return rounds.map(normalizeRound);
}

export function normalizeFixtures(fixtures: SportMonksFixture[]): FixtureDTO[] {
  return fixtures.map(normalizeFixture);
}

/**
 * Normalize SportMonks live fixture to LiveFixtureDTO
 */
export function normalizeLiveFixture(fixture: SportMonksFixture): LiveFixtureDTO {
  const participants = fixture.participants || [];
  const homeParticipant = participants.find((p) => p.meta?.location === "home") || participants[0];
  const awayParticipant = participants.find((p) => p.meta?.location === "away") || participants[1];
  
  const homeTeam = homeParticipant?.name || "";
  const awayTeam = awayParticipant?.name || "";
  
  // Extract team logos from participants
  const homeTeamLogo = (homeParticipant as { image_path?: string | null })?.image_path || null;
  const awayTeamLogo = (awayParticipant as { image_path?: string | null })?.image_path || null;

  // Handle scores as both object and array
  // For live fixtures, scores array contains multiple score objects (one per period)
  // We need to find the latest score (usually the last one in the array)
  let score: { home: number; away: number } | undefined = undefined;
  if (fixture.scores) {
    if (Array.isArray(fixture.scores)) {
      // If scores is an array, take the LAST element (most recent score)
      // Scores array is typically ordered chronologically
      const lastScore = fixture.scores[fixture.scores.length - 1];
      if (lastScore && typeof lastScore === "object") {
        const scoreObj = lastScore as { home_score?: number; away_score?: number };
        score = {
          home: scoreObj.home_score ?? 0,
          away: scoreObj.away_score ?? 0,
        };
      }
    } else if (typeof fixture.scores === "object") {
      // If scores is an object, use it directly
      const scoreObj = fixture.scores as { home_score?: number; away_score?: number };
      score = {
        home: scoreObj.home_score ?? 0,
        away: scoreObj.away_score ?? 0,
      };
    }
  }

  // Extract minute and period info from periods include (preferred method)
  // Periods include contains ticking period with minutes, seconds, has_timer, etc.
  const periods = (fixture as unknown as { periods?: Array<{
    ticking?: boolean | null;
    minutes?: number | null;
    seconds?: number | null;
    has_timer?: boolean | null;
    counts_from?: number | null;
    period_length?: number | null;
    time_added?: number | null;
  }> })?.periods;
  
  // Find the ticking period (currently being played)
  const currentPeriod = periods?.find((p) => p.ticking === true) || null;
  
  // Extract period info if available
  let periodInfo: {
    ticking?: boolean;
    minutes?: number;
    seconds?: number;
    has_timer?: boolean;
    counts_from?: number;
    period_length?: number;
    time_added?: number;
  } | null = null;
  
  if (currentPeriod) {
    periodInfo = {
      ticking: currentPeriod.ticking ?? undefined,
      minutes: currentPeriod.minutes ?? undefined,
      seconds: currentPeriod.seconds ?? undefined,
      has_timer: currentPeriod.has_timer ?? undefined,
      counts_from: currentPeriod.counts_from ?? undefined,
      period_length: currentPeriod.period_length ?? undefined,
      time_added: currentPeriod.time_added ?? undefined,
    };
  }
  
  // Calculate total minute from period: counts_from + minutes
  let minute: number | undefined = undefined;
  if (currentPeriod && currentPeriod.counts_from !== null && currentPeriod.counts_from !== undefined && 
      currentPeriod.minutes !== null && currentPeriod.minutes !== undefined) {
    minute = currentPeriod.counts_from + currentPeriod.minutes;
  } else {
    // Fallback: Try direct minute field
    minute = (fixture as unknown as { minute?: number })?.minute;
    
  // If not found, try scores.minute (handle both object and array)
  if (minute === undefined && fixture.scores) {
    if (Array.isArray(fixture.scores)) {
      const firstScore = fixture.scores[0];
      if (firstScore && typeof firstScore === "object") {
        minute = (firstScore as unknown as { minute?: number })?.minute;
      }
    } else if (typeof fixture.scores === "object") {
      minute = (fixture.scores as unknown as { minute?: number })?.minute;
    }
  }
    
    // If still not found and we have starting_at, calculate elapsed time
    if (minute === undefined && fixture.starting_at) {
      try {
        const startTime = new Date(fixture.starting_at);
        const now = new Date();
        const elapsedMs = now.getTime() - startTime.getTime();
        const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
        // Only use calculated time if match has started (positive elapsed time)
        if (elapsedMinutes > 0 && elapsedMinutes < 120) { // Max 120 minutes (2 hours)
          minute = elapsedMinutes;
        }
      } catch {
        // Ignore date parsing errors
      }
    }
  }

  // Extract league info
  const leagueId = (fixture as unknown as { league_id?: number })?.league_id || 0;

  // Extract starting_at for calculating elapsed time
  const startingAt = fixture.starting_at || null;

  return {
    fixtureId: fixture.id,
    homeTeam,
    awayTeam,
    leagueId,
    minute,
    score,
    homeTeamLogo,
    awayTeamLogo,
    startingAt,
    currentPeriod: periodInfo,
  };
}

/**
 * Normalize array of SportMonks live fixtures
 */
export function normalizeLiveFixtures(fixtures: SportMonksFixture[]): LiveFixtureDTO[] {
  return fixtures.map(normalizeLiveFixture);
}

