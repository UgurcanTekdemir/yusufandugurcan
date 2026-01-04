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
    selectedBookmakerId: null, // Use first available bookmaker if null
  },
];
