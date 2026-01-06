import { z } from "zod";

/**
 * Zod schemas for SportMonks API responses
 * These schemas validate raw SportMonks API responses before normalization
 */

/**
 * SportMonks Country schema
 */
export const SportMonksCountrySchema = z
  .object({
    id: z.number(),
    name: z.string(),
    code: z.string().nullable().optional(),
    continent_id: z.number().nullable().optional(),
    image_path: z.string().nullable().optional(),
  })
  .passthrough();

export type SportMonksCountry = z.infer<typeof SportMonksCountrySchema>;

/**
 * SportMonks League schema
 */
export const SportMonksLeagueSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    country_id: z.number().nullable().optional(),
    type: z.string().nullable().optional(),
    image_path: z.string().nullable().optional(),
    country: z
      .object({
        id: z.number(),
        name: z.string(),
        code: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough();

export type SportMonksLeague = z.infer<typeof SportMonksLeagueSchema>;

/**
 * SportMonks Season schema
 */
export const SportMonksSeasonSchema = z
  .object({
    id: z.number(),
    name: z.string().optional(),
    league_id: z.number().optional(),
    starting_at: z.string().optional(),
    ending_at: z.string().optional(),
    is_current: z.number().optional(),
  })
  .passthrough();

export type SportMonksSeason = z.infer<typeof SportMonksSeasonSchema>;

/**
 * SportMonks Stage schema
 */
export const SportMonksStageSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    season_id: z.number().optional(),
    type: z.string().optional(),
  })
  .passthrough();

export type SportMonksStage = z.infer<typeof SportMonksStageSchema>;

/**
 * SportMonks Round schema
 */
export const SportMonksRoundSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    stage_id: z.number().optional(),
    starting_at: z.string().optional(),
  })
  .passthrough();

export type SportMonksRound = z.infer<typeof SportMonksRoundSchema>;

/**
 * SportMonks Team schema
 */
export const SportMonksTeamSchema = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .passthrough();

/**
 * SportMonks Fixture schema
 */
export const SportMonksFixtureSchema = z
  .object({
    id: z.number(),
    sport_id: z.number().nullable().optional(),
    league_id: z.number().nullable().optional(),
    season_id: z.number().nullable().optional(),
    stage_id: z.number().nullable().optional(),
    group_id: z.number().nullable().optional(),
    aggregate_id: z.number().nullable().optional(),
    round_id: z.number().nullable().optional(),
    state_id: z.number().nullable().optional(),
    venue_id: z.number().nullable().optional(),
    name: z.string().nullable().optional(),
    starting_at: z.string().nullable().optional(),
    starting_at_timestamp: z.number().nullable().optional(), // Unix timestamp
    result_info: z.string().nullable().optional(),
    leg: z.string().nullable().optional(),
    details: z.string().nullable().optional(),
    length: z.number().nullable().optional(), // Length of fixture in minutes
    placeholder: z.boolean().nullable().optional(),
    has_odds: z.boolean().nullable().optional(),
    has_premium_odds: z.boolean().nullable().optional(),
    state: z.union([
      z.string().nullable().optional(),
      z.object({
        id: z.number().optional(),
        name: z.string().optional(),
        name_en: z.string().optional(),
      }).nullable().optional(),
    ]).nullable().optional(),
    scores: z
      .union([
        z.object({
          score: z.union([z.string(), z.object({}).passthrough()]).nullable().optional(),
          home_score: z.number().nullable().optional(),
          away_score: z.number().nullable().optional(),
          minute: z.number().nullable().optional(),
        }).passthrough(),
        z.array(
          z.object({
            score: z.union([z.string(), z.object({}).passthrough()]).nullable().optional(),
            home_score: z.number().nullable().optional(),
            away_score: z.number().nullable().optional(),
            minute: z.number().nullable().optional(),
          }).passthrough()
        ),
      ])
      .nullable()
      .optional(),
    participants: z
      .array(
        z.object({
          id: z.number(),
          name: z.string(),
          image_path: z.string().nullable().optional(), // Team logo URL
          meta: z
            .object({
              location: z.string().nullable().optional(),
              score: z.number().nullable().optional(), // Score for finished matches
              winner: z.boolean().nullable().optional(),
              position: z.number().nullable().optional(),
            })
            .nullable()
            .optional(),
        })
      )
      .nullable()
      .optional(),
    minute: z.number().nullable().optional(), // Current minute of the match
    periods: z
      .array(
        z.object({
          id: z.number().optional(),
          name: z.string().nullable().optional(),
          type: z.string().nullable().optional(),
          starting_at: z.string().nullable().optional(),
          ending_at: z.string().nullable().optional(),
          ticking: z.boolean().nullable().optional(), // Is this period currently being played?
          minutes: z.number().nullable().optional(), // Current minute of the period
          seconds: z.number().nullable().optional(), // Seconds within the current minute
          has_timer: z.boolean().nullable().optional(), // Is detailed timer available?
          counts_from: z.number().nullable().optional(), // Period count starts from (e.g., 0 for 1st half, 45 for 2nd half)
          period_length: z.number().nullable().optional(), // Planned duration of period (usually 45)
          time_added: z.number().nullable().optional(), // Added time (injury time)
        })
      )
      .nullable()
      .optional(),
  })
  .passthrough();

export type SportMonksFixture = z.infer<typeof SportMonksFixtureSchema>;

/**
 * SportMonks Market schema
 */
export const SportMonksMarketSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    market: z.string().optional(),
    market_description: z.string().nullable().optional(),
  })
  .passthrough();

/**
 * SportMonks Selection schema
 * Based on SportMonks API v3 Pre-match Odds fields
 */
export const SportMonksSelectionSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    odds: z.number().optional(),
    value: z.string().optional(),
    label: z.string().nullable().optional(),
    sort_order: z.number().nullable().optional(), // Sort order for selections
    market_description: z.string().nullable().optional(),
    probability: z.string().nullable().optional(),
    dp3: z.string().nullable().optional(),
    fractional: z.string().nullable().optional(),
    american: z.string().nullable().optional(),
    winning: z.boolean().nullable().optional(),
    stopped: z.boolean().nullable().optional(),
    suspended: z.boolean().nullable().optional(), // In-play odds specific field
    total: z.string().nullable().optional(),
    handicap: z.string().nullable().optional(),
    participants: z.string().nullable().optional(),
    latest_bookmaker_update: z.string().nullable().optional(),
  })
  .passthrough();

/**
 * SportMonks Bookmaker schema
 */
export const SportMonksBookmakerSchema = z
  .object({
    id: z.number(),
    name: z.string(),
  })
  .passthrough();

/**
 * SportMonks Odds schema
 * Based on SportMonks API v3 Pre-match Odds fields
 */
export const SportMonksOddsSchema = z
  .object({
    id: z.number(),
    fixture_id: z.number(),
    market_id: z.number().optional(),
    bookmaker_id: z.number().optional(),
    label: z.string().nullable().optional(),
    value: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    sort_order: z.number().nullable().optional(), // Sort order for selections
    market_description: z.string().nullable().optional(),
    probability: z.string().nullable().optional(),
    dp3: z.string().nullable().optional(),
    fractional: z.string().nullable().optional(),
    american: z.string().nullable().optional(),
    winning: z.boolean().nullable().optional(),
    stopped: z.boolean().nullable().optional(),
    suspended: z.boolean().nullable().optional(), // In-play odds specific field
    total: z.string().nullable().optional(),
    handicap: z.string().nullable().optional(),
    participants: z.string().nullable().optional(),
    latest_bookmaker_update: z.string().nullable().optional(),
    bookmaker: SportMonksBookmakerSchema.optional(),
    markets: z
      .array(
        z.object({
          id: z.number(),
          name: z.string(),
          market: z.string().optional(),
          market_description: z.string().nullable().optional(),
          selections: z
            .array(SportMonksSelectionSchema)
            .optional(),
        })
      )
      .optional(),
  })
  .passthrough();

export type SportMonksOdds = z.infer<typeof SportMonksOddsSchema>;

/**
 * SportMonks API Response wrapper schema (data array)
 */
export const SportMonksResponseSchema = z
  .object({
    data: z.any(),
  })
  .passthrough();

/**
 * SportMonks API Response wrapper schema (single data object)
 */
export const SportMonksSingleResponseSchema = z
  .object({
    data: z.unknown(),
  })
  .passthrough();

/**
 * SportMonks API Multi Response schema (collection with pagination)
 * Used for endpoints that return arrays of data with pagination
 */
export const SportMonksMultiResponseSchema = z
  .object({
    data: z.array(z.unknown()),
    pagination: z
      .object({
        count: z.number().optional(),
        per_page: z.number().optional(),
        current_page: z.number().optional(),
        next_page: z.number().nullable().optional(),
        has_more: z.boolean().optional(),
      })
      .optional(),
  })
  .passthrough();

/**
 * SportMonks API Collection Response schema (alias for MultiResponse)
 */
export const SportMonksCollectionResponseSchema = SportMonksMultiResponseSchema;

