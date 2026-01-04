import { z } from "zod";
import type { FixtureDTO, OddsDTO } from "../types/index.js";

/**
 * Schema for creating a slip
 */
export const SlipCreateInputSchema = z.object({
  userId: z.string().min(1),
  lines: z.array(
    z.object({
      fixtureId: z.union([z.string(), z.number()]),
      market: z.string().min(1),
      selection: z.string().min(1),
      odds: z.number().positive(),
    })
  ),
  stake: z.number().positive(),
});

export type SlipCreateInput = z.infer<typeof SlipCreateInputSchema>;

/**
 * Schema for transaction input
 */
export const TransactionInputSchema = z.object({
  userId: z.string().min(1),
  slipId: z.string().optional(),
  type: z.enum(["deposit", "withdrawal", "bet", "win", "refund"]),
  amount: z.number().positive(),
});

export type TransactionInput = z.infer<typeof TransactionInputSchema>;

/**
 * Extensible schema for parsing FixtureDTO
 * Minimal MVP structure - can be extended for full SportMonks responses
 */
export const FixtureDTOSchema: z.ZodType<FixtureDTO> = z.object({
  fixtureId: z.union([z.string(), z.number()]),
  teams: z.object({
    home: z.string(),
    away: z.string(),
  }),
  kickoffAt: z.union([z.string().datetime(), z.date(), z.string()]),
  isLive: z.boolean(),
  score: z
    .object({
      home: z.number(),
      away: z.number(),
    })
    .optional(),
});

/**
 * Extensible schema for parsing OddsDTO
 * Minimal MVP structure - can be extended for full SportMonks responses
 */
export const OddsDTOSchema: z.ZodType<OddsDTO> = z.object({
  fixtureId: z.union([z.string(), z.number()]),
  markets: z.array(
    z.object({
      market: z.string(),
      selection: z.string(),
      odds: z.number().positive(),
    })
  ),
});
