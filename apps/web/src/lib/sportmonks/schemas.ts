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
    code: z.string().optional(),
    image_path: z.string().optional(),
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
    country_id: z.number().optional(),
    type: z.string().optional(),
    image_path: z.string().optional(),
    country: z
      .object({
        id: z.number(),
        name: z.string(),
        code: z.string().optional(),
      })
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
    name: z.string().optional(),
    starting_at: z.string().optional(),
    result_info: z.string().optional(),
    state: z.string().optional(),
    scores: z
      .object({
        score: z.string().optional(),
        home_score: z.number().optional(),
        away_score: z.number().optional(),
      })
      .optional(),
    participants: z
      .array(
        z.object({
          id: z.number(),
          name: z.string(),
          meta: z
            .object({
              location: z.string().optional(),
            })
            .optional(),
        })
      )
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
  })
  .passthrough();

/**
 * SportMonks Selection schema
 */
export const SportMonksSelectionSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    odds: z.number().optional(),
    value: z.string().optional(),
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
 */
export const SportMonksOddsSchema = z
  .object({
    id: z.number(),
    fixture_id: z.number(),
    bookmaker_id: z.number().optional(),
    bookmaker: SportMonksBookmakerSchema.optional(),
    markets: z
      .array(
        z.object({
          id: z.number(),
          name: z.string(),
          market: z.string().optional(),
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
    data: z.array(z.unknown()),
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

