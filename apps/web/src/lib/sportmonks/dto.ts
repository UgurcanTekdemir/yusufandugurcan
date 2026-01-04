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
import { marketsWhitelist, bookmakerConfig } from "@repo/shared/constants";
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
  const score = fixture.scores
    ? {
        home: fixture.scores.home_score || 0,
        away: fixture.scores.away_score || 0,
      }
    : undefined;

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
 * Get selected bookmaker ID from config
 */
function getSelectedBookmakerId(): string | number | null {
  const config = bookmakerConfig.find((c) => c.id === "sportmonks");
  return config?.selectedBookmakerId || null;
}

/**
 * Normalize SportMonks odds to OddsDTO
 */
export function normalizeOdds(odds: SportMonksOdds): OddsDTO {
  const fixtureId = odds.fixture_id;
  const markets: OddsDTO["markets"] = [];

  // Get selected bookmaker ID (or use first available)
  const selectedBookmakerId = getSelectedBookmakerId();

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

      markets.push({
        market: marketName,
        selection: selection.name || selection.value || "",
        odds: selection.odds,
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

