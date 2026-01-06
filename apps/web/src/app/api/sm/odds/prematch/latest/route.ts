import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksOddsSchema,
  SportMonksMultiResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeOdds, transformOddsArrayToMarketsFormat } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  include: z.string().optional(),
  select: z.string().optional(),
  filters: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/odds/prematch/latest?include=market;bookmaker;fixture&filters=bookmakers:23
 * Fetch latest pre-match odds from SportMonks API
 * 
 * Returns pre-match odds updated in the last 10 seconds.
 * 
 * Query parameters:
 * - include: market, bookmaker, fixture (semicolon-separated)
 * - select: Select specific fields
 * - filters: Static filters (bookmakers:2,14 | winningOdds) or dynamic filters
 * - locale: Translate name fields
 * 
 * Static filters:
 * - bookmakers:2,14 - Filter by bookmaker IDs
 * - winningOdds - Filter all winning odds
 * 
 * Response format: Flat array of odds objects (same as Get All Odds)
 * Empty array means no changes in the last 10 seconds.
 * 
 * Polling frequency: Every 10 seconds (360 calls per hour) to match the fixed update window.
 * Optionally poll every 5-8 seconds to reduce latency (if rate limits allow).
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      include: searchParams.get("include") || undefined,
      select: searchParams.get("select") || undefined,
      filters: searchParams.get("filters") || undefined,
      locale: searchParams.get("locale") || undefined,
    });

    const response = await sportmonksClient.getPrematchOddsLatest({
      include: query.include,
      select: query.select,
      filters: query.filters,
      locale: query.locale,
    });
    
    // Validate response structure (expecting collection response with data array)
    const validated = SportMonksMultiResponseSchema.parse(response);
    
    // The response is a flat array of odds objects
    // Each object has: id, fixture_id, market_id, bookmaker_id, label, value, name, etc.
    // We need to group them by fixture_id and market_id to create the markets structure
    const flatOddsArray = validated.data as Array<{
      id: number;
      fixture_id: number;
      market_id: number;
      bookmaker_id?: number;
      label: string;
      value: string;
      name?: string;
      market_description?: string | null;
      probability?: string | null;
      dp3?: string | null;
      fractional?: string | null;
      american?: string | null;
      winning?: boolean | null;
      stopped?: boolean | null;
      total?: string | null;
      handicap?: string | null;
      participants?: string | null;
      latest_bookmaker_update?: string | null;
      [key: string]: unknown;
    }>;

    // If empty array, return early (no changes in last 10 seconds)
    if (flatOddsArray.length === 0) {
      return NextResponse.json({
        data: [],
        pagination: validated.pagination,
        message: "No odds updated in the last 10 seconds",
      });
    }

    // Group odds by fixture_id
    const oddsByFixture = new Map<number, typeof flatOddsArray>();
    for (const oddsItem of flatOddsArray) {
      const fixtureId = oddsItem.fixture_id;
      if (!oddsByFixture.has(fixtureId)) {
        oddsByFixture.set(fixtureId, []);
      }
      oddsByFixture.get(fixtureId)!.push(oddsItem);
    }

    // Transform each fixture's odds array to markets format and normalize
    const normalized = Array.from(oddsByFixture.entries()).map(([fixtureId, oddsArray]) => {
      // Transform flat odds array to markets format
      const oddsWithMarkets = transformOddsArrayToMarketsFormat(fixtureId, oddsArray);
      // Normalize to OddsDTO
      return normalizeOdds(oddsWithMarkets);
    });

    return NextResponse.json({
      data: normalized,
      pagination: validated.pagination,
    });
  } catch (error) {
    console.error("Error fetching prematch odds latest:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid query parameters or upstream response schema mismatch",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.startsWith("SportMonks ")) {
      const match = error.message.match(/SportMonks (\d+): (.+)/);
      if (match) {
        const status = parseInt(match[1]!, 10);
        const body = match[2]!;
        return NextResponse.json(
          { error: `Upstream error: ${error.message}`, upstream: body },
          { status }
        );
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch latest prematch odds" },
      { status: 500 }
    );
  }
}


