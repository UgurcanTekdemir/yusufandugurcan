import "server-only";
import type {
  CountryDTO,
  FixtureDTO,
  LeagueDTO,
  OddsDTO,
  RoundDTO,
  SeasonDTO,
  StageDTO,
} from "@repo/shared/types";
import { marketsWhitelist, BET365_BOOKMAKER_ID } from "@repo/shared/constants";
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
    type: league.type,
    logo: league.image_path,
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
 * Normalize SportMonks fixture to FixtureDTO
 */
export function normalizeFixture(fixture: SportMonksFixture): FixtureDTO {
  const participants = fixture.participants || [];
  const homeTeam =
    participants.find((p) => p.meta?.location === "home")?.name ||
    participants[0]?.name ||
    "";
  const awayTeam =
    participants.find((p) => p.meta?.location === "away")?.name ||
    participants[1]?.name ||
    "";

  const isLive = fixture.state === "LIVE" || fixture.state === "LIVE-HT";
  
  // Parse scores: filter by description === "CURRENT" and match by participant_id
  let score: { home: number; away: number } | undefined = undefined;
  if (fixture.scores && Array.isArray(fixture.scores)) {
    const currentScores = fixture.scores.filter((s) => s.description === "CURRENT");
    if (currentScores.length > 0) {
      const homeParticipant = participants.find((p) => p.meta?.location === "home");
      const awayParticipant = participants.find((p) => p.meta?.location === "away");
      
      const homeScore = homeParticipant
        ? currentScores.find((s) => s.participant_id === homeParticipant.id)?.score
        : undefined;
      const awayScore = awayParticipant
        ? currentScores.find((s) => s.participant_id === awayParticipant.id)?.score
        : undefined;
      
      // Parse score strings (e.g., "2", "3") to numbers
      const homeScoreNum = homeScore ? parseInt(homeScore, 10) : undefined;
      const awayScoreNum = awayScore ? parseInt(awayScore, 10) : undefined;
      
      if (homeScoreNum !== undefined && awayScoreNum !== undefined && !isNaN(homeScoreNum) && !isNaN(awayScoreNum)) {
        score = {
          home: homeScoreNum,
          away: awayScoreNum,
        };
      }
    }
  }

  return {
    fixtureId: fixture.id,
    teams: {
      home: homeTeam,
      away: awayTeam,
    },
    kickoffAt: fixture.starting_at || new Date().toISOString(),
    isLive,
    score,
  };
}

/**
 * Map SportMonks market name to our whitelist format
 */
function mapMarketName(sportMonksMarketName: string): string | null {
  const marketLower = sportMonksMarketName.toLowerCase();

  // Map SportMonks market names to our whitelist
  if (marketLower.includes("1x2") || marketLower.includes("match winner")) {
    return "1X2";
  }
  if (
    marketLower.includes("over/under") ||
    marketLower.includes("over_under") ||
    marketLower.includes("ou2.5")
  ) {
    return "OU2.5";
  }
  if (
    marketLower.includes("both teams to score") ||
    marketLower.includes("btts")
  ) {
    return "BTTS";
  }

  // Check if it matches any whitelist entry
  const whitelistLower = marketsWhitelist.map((m) => m.toLowerCase());
  const index = whitelistLower.findIndex((w) =>
    marketLower.includes(w) || w.includes(marketLower)
  );
  if (index >= 0) {
    return marketsWhitelist[index];
  }

  return null;
}

/**
 * Normalize SportMonks odds to OddsDTO
 * Filters to bet365 bookmaker (ID=2) and market whitelist
 */
export function normalizeOdds(odds: SportMonksOdds, bookmakerId?: number | string): OddsDTO {
  const fixtureId = odds.fixture_id;
  const markets: OddsDTO["markets"] = [];

  // Use provided bookmakerId or default to bet365
  const targetBookmakerId = bookmakerId ?? BET365_BOOKMAKER_ID;

  // Filter markets by whitelist
  const oddsMarkets = odds.markets || [];
  for (const market of oddsMarkets) {
    const marketName = mapMarketName(market.name || market.market || "");
    if (!marketName) {
      continue; // Skip markets not in whitelist
    }

    // Process selections
    const selections = market.selections || [];
    for (const selection of selections) {
      if (!selection.odds || selection.odds <= 0) {
        continue;
      }

      // Note: When using bookmaker-specific endpoints (e.g., /bookmakers/{id}),
      // SportMonks already filters by bookmaker, so we don't need to filter here.
      // The bookmakerId parameter is used for logging/clarity but the API response
      // already contains only the requested bookmaker's odds.
      
      // Include stopped/suspended flags for UI disabled state
      // Markets array is already grouped by market_id from SportMonks API

      markets.push({
        market: marketName,
        selection: selection.name || selection.value || "",
        odds: selection.odds,
        stopped: selection.stopped ?? false,
        suspended: selection.suspended ?? false,
      });
    }
  }

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

