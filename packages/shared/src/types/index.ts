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
  kickoffAt: Date | string;
  isLive: boolean;
  score?: Score;
}

/**
 * Market odds structure
 */
export interface MarketOdds {
  market: string;
  selection: string;
  odds: number;
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
}

/**
 * League DTO structure
 */
export interface LeagueDTO {
  leagueId: string | number;
  name: string;
  country?: string;
  type?: string;
  logo?: string;
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
 * Round DTO structure
 */
export interface RoundDTO {
  roundId: string | number;
  name: string;
  stageId: string | number;
  startingAt?: Date | string;
}
