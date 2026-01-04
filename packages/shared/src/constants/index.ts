/**
 * Whitelist of allowed market types
 * Matches SportMonks market names: 1X2, OU2.5, BTTS
 */
export const marketsWhitelist = [
  "1X2",
  "OU2.5",
  "BTTS",
  "1x2",
  "over_under",
  "both_teams_to_score",
  "double_chance",
  "handicap",
  "correct_score",
] as const;

export type MarketType = (typeof marketsWhitelist)[number];

/**
 * Bookmaker IDs
 */
export const BET365_BOOKMAKER_ID = 2;

/**
 * Bookmaker configuration
 */
export interface BookmakerConfig {
  id: string;
  name: string;
  isActive: boolean;
  apiEndpoint?: string;
  rateLimit?: {
    requests: number;
    window: number; // in milliseconds
  };
  selectedBookmakerId?: string | null;
}

export const bookmakerConfig: BookmakerConfig[] = [
  {
    id: "sportmonks",
    name: "SportMonks",
    isActive: true,
    rateLimit: {
      requests: 100,
      window: 60000, // 1 minute
    },
    selectedBookmakerId: BET365_BOOKMAKER_ID.toString(), // Use bet365 as default
  },
];

/**
 * Top Football Leagues
 * Common SportMonks league IDs (may vary by season)
 */
export const TOP_LEAGUES = [
  { id: 8, name: "Premier League", country: "England" },
  { id: 564, name: "La Liga", country: "Spain" },
  { id: 135, name: "Serie A", country: "Italy" },
  { id: 39, name: "Bundesliga", country: "Germany" },
  { id: 301, name: "Ligue 1", country: "France" },
] as const;

/**
 * League filter groups
 */
export const LEAGUE_FILTERS = {
  "top-leagues": "Top Leagues",
  "united-kingdom": "United Kingdom",
  "italy": "Italy",
  "spain": "Spain",
  "germany": "Germany",
  "france": "France",
  "internationals": "Internationals",
  "europe": "Europe",
} as const;

export type LeagueFilterKey = keyof typeof LEAGUE_FILTERS;
