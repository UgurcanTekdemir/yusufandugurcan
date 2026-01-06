/**
 * User role type
 */
export type Role = "superadmin" | "dealer" | "user";

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Dealer entity
 */
export interface Dealer {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Transaction entity
 */
export interface Transaction {
  id: string;
  userId: string;
  slipId?: string;
  type: "deposit" | "withdrawal" | "bet" | "win" | "refund";
  amount: number;
  status: "pending" | "completed" | "failed";
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Bet line within a slip
 */
export interface BetLine {
  id: string;
  fixtureId: string | number;
  market: string;
  selection: string;
  odds: number;
}

/**
 * Slip (bet slip) entity
 */
export interface Slip {
  id: string;
  userId: string;
  oddsSnapshot: Record<string, number>;
  lines: BetLine[];
  totalOdds: number;
  stake: number;
  potentialWin: number;
  status: "pending" | "placed" | "won" | "lost" | "cancelled";
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Team information
 */
export interface TeamInfo {
  home: string;
  away: string;
}

/**
 * Score information
 */
export interface Score {
  home: number;
  away: number;
}

/**
 * Minimal MVP FixtureDTO structure
 * Extensible for future SportMonks integration
 */
export interface FixtureDTO {
  fixtureId: string | number;
  teams: TeamInfo;
  homeTeam?: string;
  awayTeam?: string;
  kickoffAt: Date | string;
  leagueId?: string | number;
  leagueName?: string;
  isLive: boolean;
  isFinished?: boolean; // True if fixture has finished (FT, FT_PEN, CANCL, etc.)
  isStarted?: boolean; // True if fixture has started (LIVE, HT, FT, etc.)
  hasOdds?: boolean;
  score?: Score;
  minute?: number | null; // Current minute of the match (for live matches)
  homeTeamLogo?: string | null; // Team logo URL for home team
  awayTeamLogo?: string | null; // Team logo URL for away team
  state?: string | null; // Match state (NS, LIVE, HT, FT, FT_PEN, etc.)
}

/**
 * Market odds structure
 * Based on SportMonks API v3 Pre-match Odds fields
 */
export interface MarketOdds {
  market: string;
  selection: string;
  odds: number;
  marketId?: number;
  devName?: string;
  label?: string;
  template?: import("../constants/marketDisplay.js").MarketTemplate;
  line?: number | string | null;
  selectionRaw?: string;
  group?: string;
  // Additional SportMonks pre-match odds fields
  marketDescription?: string | null;
  probability?: string | null;
  dp3?: string | null;
  fractional?: string | null;
  american?: string | null;
  winning?: boolean | null;
  stopped?: boolean | null;
  total?: string | null;
  handicap?: string | null;
  participants?: string | null;
  latestBookmakerUpdate?: string | null;
  bookmakerId?: number;
}

/**
 * Minimal MVP OddsDTO structure
 * Extensible for future SportMonks integration
 */
export interface OddsDTO {
  fixtureId: string | number;
  markets: MarketOdds[];
}

/**
 * Country DTO structure
 */
export interface CountryDTO {
  countryId: string | number;
  name: string;
  code?: string;
  continentId?: string | number;
  flagUrl?: string;
}

/**
 * League DTO structure
 */
export interface LeagueDTO {
  leagueId: string | number;
  name: string;
  country?: string;
  countryId?: string | number;
  type?: string;
  logo?: string;
  logoUrl?: string;
}

/**
 * Season DTO structure
 */
export interface SeasonDTO {
  seasonId: string | number;
  name: string;
  leagueId: string | number;
  startDate?: Date | string;
  endDate?: Date | string;
}

/**
 * Stage DTO structure
 */
export interface StageDTO {
  stageId: string | number;
  name: string;
  seasonId: string | number;
  type?: string;
}

/**
 * Live Fixture DTO structure
 * Extends FixtureDTO with live-specific fields
 */
export interface PeriodInfo {
  ticking?: boolean; // Is this period currently being played?
  minutes?: number; // Current minute of the period
  seconds?: number; // Seconds within the current minute
  has_timer?: boolean; // Is detailed timer available?
  counts_from?: number; // Period count starts from (e.g., 0 for 1st half, 45 for 2nd half)
  period_length?: number; // Planned duration of period (usually 45)
  time_added?: number; // Added time (injury time)
}

export interface LiveFixtureDTO {
  fixtureId: string | number;
  homeTeam: string;
  awayTeam: string;
  leagueId: string | number;
  minute?: number;
  score?: Score;
  homeTeamLogo?: string | null; // Team logo URL for home team
  awayTeamLogo?: string | null; // Team logo URL for away team
  startingAt?: string | null; // Starting time for calculating elapsed time
  currentPeriod?: PeriodInfo | null; // Current period information (ticking=true)
}

/**
 * Round DTO structure
 */
export interface RoundDTO {
  roundId: string | number;
  name: string;
  stageId: string | number;
  startingAt?: Date | string;
}
