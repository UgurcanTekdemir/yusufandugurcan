import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksOddsSchema,
  SportMonksSingleResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeOdds, transformOddsArrayToMarketsFormat } from "@/lib/sportmonks/dto";

const ParamsSchema = z.object({
  fixtureId: z.string().regex(/^\d+$/, "Fixture ID must be a number"),
  marketId: z.string().regex(/^\d+$/, "Market ID must be a number"),
});

const QuerySchema = z.object({
  include: z.string().optional(),
  select: z.string().optional(),
  filters: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/odds/prematch/by-fixture/[fixtureId]/markets/[marketId]?include=market;bookmaker;fixture&filters=bookmakers:23
 * Fetch pre-match odds for a fixture filtered by market ID
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
 * Response format: Flat array of odds objects (same as Get Odds by Fixture ID)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fixtureId: string; marketId: string } }
) {
  try {
    // Validate route params
    const routeParams = ParamsSchema.parse({
      fixtureId: params.fixtureId,
      marketId: params.marketId,
    });

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      include: searchParams.get("include") || undefined,
      select: searchParams.get("select") || undefined,
      filters: searchParams.get("filters") || undefined,
      locale: searchParams.get("locale") || undefined,
    });

    const fixtureId = Number(routeParams.fixtureId);
    const marketId = Number(routeParams.marketId);

    const response = await sportmonksClient.getPrematchOddsByFixtureAndMarket(
      fixtureId,
      marketId,
      {
        include: query.include,
        select: query.select,
        filters: query.filters,
        locale: query.locale,
      }
    );

    // Handle different response formats (similar to prematch/route.ts)
    // Primary format: Flat array of odds objects
    let oddsItem: unknown;

    if (response && typeof response === "object" && "data" in response) {
      const data = (response as { data: unknown }).data;
      
      // Check if data is a flat array of odds objects (primary format for this endpoint)
      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0] as Record<string, unknown>;
        // Check if it's a flat odds array (has fixture_id, market_id, label, value)
        if (firstItem.fixture_id && firstItem.market_id && firstItem.label && firstItem.value) {
          console.log("[PREMATCH ODDS BY MARKET] Detected flat odds array format, transforming to markets format");
          oddsItem = transformOddsArrayToMarketsFormat(fixtureId, data as Array<{
            id?: number;
            market_id: number;
            label: string;
            value: string;
            name?: string;
            total?: string | null;
            handicap?: string | null;
            market_description?: string | null;
            probability?: string | null;
            dp3?: string | null;
            fractional?: string | null;
            american?: string | null;
            winning?: boolean | null;
            stopped?: boolean | null;
            participants?: string | null;
            latest_bookmaker_update?: string | null;
            [key: string]: unknown;
          }>);
          console.log("[PREMATCH ODDS BY MARKET] Transformed flat odds array to markets format:", {
            marketsCount: (oddsItem as { markets?: unknown[] }).markets?.length || 0,
          });
        } else {
          // Array but not flat odds format, take first element
          oddsItem = data[0];
        }
      } else if (data && typeof data === "object" && !Array.isArray(data)) {
        const dataObj = data as Record<string, unknown>;

        if (dataObj.odds && typeof dataObj.odds === "object") {
          const odds = dataObj.odds as Record<string, unknown>;

          if (Array.isArray(odds)) {
            console.log("[PREMATCH ODDS BY MARKET] Detected odds array format, transforming to markets format");
            oddsItem = transformOddsArrayToMarketsFormat(fixtureId, odds as Array<{
              id?: number;
              market_id: number;
              label: string;
              value: string;
              name?: string;
              total?: string | null;
              handicap?: string | null;
              market_description?: string | null;
              [key: string]: unknown;
            }>);
          } else if (odds.preMatch && typeof odds.preMatch === "object") {
            oddsItem = odds.preMatch;
          } else if (odds.pre_match && typeof odds.pre_match === "object") {
            oddsItem = odds.pre_match;
          } else {
            oddsItem = odds;
          }
        } else if (dataObj.markets) {
          oddsItem = dataObj;
        } else {
          oddsItem = dataObj;
        }
      } else if (Array.isArray(data)) {
        if (data.length === 0) {
          return NextResponse.json(
            { error: "No odds found for this fixture and market" },
            { status: 404 }
          );
        }
        oddsItem = data[0];
      } else {
        oddsItem = data;
      }
    } else if (Array.isArray(response)) {
      // Direct array response
      if (response.length === 0) {
        return NextResponse.json(
          { error: "No odds found for this fixture and market" },
          { status: 404 }
        );
      }
      // Check if it's flat odds array format
      const firstItem = response[0] as Record<string, unknown>;
      if (firstItem.fixture_id && firstItem.market_id && firstItem.label && firstItem.value) {
        console.log("[PREMATCH ODDS BY MARKET] Detected flat odds array format (direct array), transforming to markets format");
        oddsItem = transformOddsArrayToMarketsFormat(fixtureId, response as Array<{
          id?: number;
          market_id: number;
          label: string;
          value: string;
          name?: string;
          total?: string | null;
          handicap?: string | null;
          [key: string]: unknown;
        }>);
      } else {
        oddsItem = response[0];
      }
    } else {
      oddsItem = response;
    }

    // Ensure required fields
    let oddsWithRequiredFields = oddsItem;

    if (oddsItem && typeof oddsItem === "object" && !Array.isArray(oddsItem)) {
      const oddsObj = oddsItem as Record<string, unknown>;

      if (Array.isArray(oddsObj.markets)) {
        oddsWithRequiredFields = {
          ...oddsObj,
          fixture_id: oddsObj.fixture_id ?? fixtureId,
          id: oddsObj.id ?? oddsObj.fixture_id ?? fixtureId,
        };
      } else {
        oddsWithRequiredFields = {
          ...oddsObj,
          fixture_id: oddsObj.fixture_id ?? fixtureId,
          id: oddsObj.id ?? oddsObj.fixture_id ?? fixtureId,
        };
      }
    }

    const odds = SportMonksOddsSchema.parse(oddsWithRequiredFields);
    const normalized = normalizeOdds(odds);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching prematch odds by fixture and market:", error);

    if (error instanceof z.ZodError) {
      const isRouteError = error.errors.some(
        (err) => err.path.length === 1 && (err.path[0] === "fixtureId" || err.path[0] === "marketId")
      );

      if (isRouteError) {
        return NextResponse.json(
          { error: "Invalid route parameters", details: error.errors },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          {
            error: "Invalid response format from SportMonks API",
            details: error.errors,
          },
          { status: 502 }
        );
      }
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
      { error: error instanceof Error ? error.message : "Failed to fetch prematch odds" },
      { status: 500 }
    );
  }
}

