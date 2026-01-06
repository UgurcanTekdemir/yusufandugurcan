import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import { SportMonksOddsSchema } from "@/lib/sportmonks/schemas";
import { normalizeOdds, transformOddsArrayToMarketsFormat } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  fixtureId: z.string().min(1, "fixtureId is required"),
  marketId: z.string().min(1, "marketId is required"),
  include: z.string().optional(),
  select: z.string().optional(),
  filters: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/odds/inplay/by-fixture/[fixtureId]/markets/[marketId]?include=markets:name;bookmakers:name&filters=bookmakers:23
 * Fetch in-play odds for a fixture filtered by market ID
 * 
 * Query parameters:
 * - fixtureId: Required - Fixture ID (from URL path)
 * - marketId: Required - Market ID (from URL path)
 * - include: markets, bookmakers, fixture (semicolon-separated)
 * - select: Select specific fields
 * - filters: Static filters (bookmakers:2,14 | winningOdds) or dynamic filters
 * - locale: Translate name fields
 * 
 * Static filters:
 * - bookmakers:2,14 - Filter by bookmaker IDs (comma-separated, e.g., 2,14)
 * 
 * Response format: Flat array of odds objects (same as Get Inplay Odds by Fixture ID)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fixtureId: string; marketId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      fixtureId: params.fixtureId,
      marketId: params.marketId,
      include: searchParams.get("include") || undefined,
      select: searchParams.get("select") || undefined,
      filters: searchParams.get("filters") || undefined,
      locale: searchParams.get("locale") || undefined,
    });

    const marketId = Number(query.marketId);
    const fixtureId = Number(query.fixtureId);

    const response = await sportmonksClient.getInplayOddsByFixtureAndMarket(
      fixtureId,
      marketId,
      {
        include: query.include,
        select: query.select,
        filters: query.filters,
        locale: query.locale,
      }
    );

    // Handle different response formats (same as prematch/by-fixture/[fixtureId]/markets/[marketId])
    let oddsItem: unknown;

    if (response && typeof response === "object" && "data" in response) {
      const data = (response as { data: unknown }).data;
      
      // Check if data is a flat array of odds objects (primary format for this endpoint)
      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0] as Record<string, unknown>;
        // Check if it's a flat odds array (has fixture_id, market_id, label, value)
        if (firstItem.fixture_id && firstItem.market_id && firstItem.label && firstItem.value) {
          console.log("[INPLAY ODDS BY MARKET] Detected flat odds array format, transforming to markets format");
          oddsItem = transformOddsArrayToMarketsFormat(fixtureId, data as Array<{
            id?: number;
            market_id: number;
            label: string;
            value: string;
            name?: string;
            sort_order?: number | null;
            total?: string | null;
            handicap?: string | null;
            market_description?: string | null;
            probability?: string | null;
            dp3?: string | null;
            fractional?: string | null;
            american?: string | null;
            winning?: boolean | null;
            suspended?: boolean | null; // In-play odds specific field
            stopped?: boolean | null;
            participants?: string | null;
            latest_bookmaker_update?: string | null;
            [key: string]: unknown;
          }>);
          console.log("[INPLAY ODDS BY MARKET] Transformed flat odds array to markets format:", {
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
            console.log("[INPLAY ODDS BY MARKET] Detected odds array format, transforming to markets format");
            oddsItem = transformOddsArrayToMarketsFormat(fixtureId, odds as Array<{
              id?: number;
              market_id: number;
              label: string;
              value: string;
              name?: string;
              sort_order?: number | null;
              total?: string | null;
              handicap?: string | null;
              market_description?: string | null;
              suspended?: boolean | null; // In-play odds specific field
              [key: string]: unknown;
            }>);
          } else if (odds.inPlay && typeof odds.inPlay === "object") {
            oddsItem = odds.inPlay;
          } else if (odds.in_play && typeof odds.in_play === "object") {
            oddsItem = odds.in_play;
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
        console.log("[INPLAY ODDS BY MARKET] Detected flat odds array format (direct array), transforming to markets format");
        oddsItem = transformOddsArrayToMarketsFormat(fixtureId, response as Array<{
          id?: number;
          market_id: number;
          label: string;
          value: string;
          name?: string;
          sort_order?: number | null;
          total?: string | null;
          handicap?: string | null;
          suspended?: boolean | null; // In-play odds specific field
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

    const parsed = SportMonksOddsSchema.parse(oddsWithRequiredFields);
    const normalized = normalizeOdds(parsed);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching inplay odds by fixture and market:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    // Parse upstream error status if available
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

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch inplay odds" },
      { status: 500 }
    );
  }
}

