import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksOddsSchema,
  SportMonksSingleResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeOdds, transformOddsArrayToMarketsFormat } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  fixtureId: z.string().min(1),
  include: z.string().optional(),
  select: z.string().optional(),
  filters: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/odds/prematch?fixtureId=123&include=market;bookmaker;fixture&filters=bookmakers:23
 * Fetch prematch odds for a fixture
 * 
 * Query parameters:
 * - include: market, bookmaker, fixture (semicolon-separated)
 * - select: Select specific fields
 * - filters: Static filters (markets, bookmakers, winningOdds) or dynamic filters
 *   - Static filters: markets:12,14 | bookmakers:2,14 | winningOdds
 * - locale: Translate name fields
 * 
 * Response format: Flat array of odds objects (same as Get All Odds)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      fixtureId: searchParams.get("fixtureId") ?? "",
      include: searchParams.get("include") || undefined,
      select: searchParams.get("select") || undefined,
      filters: searchParams.get("filters") || undefined,
      locale: searchParams.get("locale") || undefined,
    });

    // Optimize includes if not provided: use field selection to reduce payload
    const optimizedInclude = query.include || "market:name;bookmaker:name";

    // Default to Bet365 (bookmaker ID: 2) if no filters provided
    const filters = query.filters || "bookmakers:2";

    const response = await sportmonksClient.getPrematchOdds(
      Number(query.fixtureId),
      {
        include: optimizedInclude,
        select: query.select,
        filters: filters,
        locale: query.locale,
      }
    );

    // Debug: Log raw API response
    console.log("[PREMATCH ODDS] Raw API response for fixture", query.fixtureId, ":", {
      isArray: Array.isArray(response),
      hasData: response && typeof response === "object" && "data" in response,
      responseType: typeof response,
      responseKeys: response && typeof response === "object" && !Array.isArray(response) ? Object.keys(response) : [],
      responsePreview: JSON.stringify(response).substring(0, 500),
    });

    // SportMonks API may return different formats:
    // 1. Flat array format (primary): { data: [{ id, fixture_id, market_id, label, value, ... }] }
    // 2. Nested markets format: { data: { markets: [...] } }
    // 3. Fixture with odds include: { data: { id: ..., odds: { preMatch: { markets: [...] } } } }
    // 4. Fixture with odds array: { data: { id: ..., odds: [...] } }
    
    let oddsItem: unknown;
    const fixtureId = Number(query.fixtureId);

    if (response && typeof response === "object" && "data" in response) {
      // Response with data wrapper
      const data = (response as { data: unknown }).data;
      
      // Check if data is a flat array of odds objects (primary format for this endpoint)
      if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0] as Record<string, unknown>;
        // Check if it's a flat odds array (has fixture_id, market_id, label, value)
        if (firstItem.fixture_id && firstItem.market_id && firstItem.label && firstItem.value) {
          console.log("[PREMATCH ODDS] Detected flat odds array format, transforming to markets format");
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
          console.log("[PREMATCH ODDS] Transformed flat odds array to markets format:", {
            marketsCount: (oddsItem as { markets?: unknown[] }).markets?.length || 0,
          });
        } else {
          // Array but not flat odds format, take first element
          oddsItem = data[0];
        }
      } else if (data && typeof data === "object" && !Array.isArray(data)) {
        // Check if data is a fixture object with odds included
        const dataObj = data as Record<string, unknown>;
        
        // If fixture has odds.preMatch nested structure
        if (dataObj.odds && typeof dataObj.odds === "object") {
          const odds = dataObj.odds as Record<string, unknown>;
          
          // Check if odds is an array (Bet365-style format: include=odds&filters=bookmakers:23)
          if (Array.isArray(odds)) {
            console.log("[PREMATCH ODDS] Detected odds array format, transforming to markets format");
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
            console.log("[PREMATCH ODDS] Transformed odds array to markets format:", {
              marketsCount: (oddsItem as { markets?: unknown[] }).markets?.length || 0,
            });
          } else if (odds.preMatch && typeof odds.preMatch === "object") {
            oddsItem = odds.preMatch;
            console.log("[PREMATCH ODDS] Extracted odds from fixture.odds.preMatch structure");
          } else if (odds.pre_match && typeof odds.pre_match === "object") {
            oddsItem = odds.pre_match;
            console.log("[PREMATCH ODDS] Extracted odds from fixture.odds.pre_match structure");
          } else {
            // If odds is directly the odds object
            oddsItem = odds;
            console.log("[PREMATCH ODDS] Using odds object directly from fixture.odds");
          }
        } else if (dataObj.markets) {
          // If data is already an odds object with markets
          oddsItem = dataObj;
          console.log("[PREMATCH ODDS] Using data object directly (has markets)");
        } else {
          // Data is a single object (could be fixture or odds)
          oddsItem = dataObj;
        }
      } else if (Array.isArray(data)) {
        // Data is an array but empty
        if (data.length === 0) {
          return NextResponse.json(
            { error: "No odds found for this fixture" },
            { status: 404 }
          );
        }
        oddsItem = data[0];
      } else {
        // Data is a single value
        oddsItem = data;
      }
    } else if (Array.isArray(response)) {
      // Direct array response
      if (response.length === 0) {
        return NextResponse.json(
          { error: "No odds found for this fixture" },
          { status: 404 }
        );
      }
      // Check if it's flat odds array format
      const firstItem = response[0] as Record<string, unknown>;
      if (firstItem.fixture_id && firstItem.market_id && firstItem.label && firstItem.value) {
        console.log("[PREMATCH ODDS] Detected flat odds array format (direct array), transforming to markets format");
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
      // Direct object response
      oddsItem = response;
    }

    // Final check: ensure we have a single object, not an array
    if (Array.isArray(oddsItem)) {
      console.error("[PREMATCH ODDS] ERROR: oddsItem is still an array after processing");
      return NextResponse.json(
        { error: "Unexpected array format in odds response", details: "Expected single odds object, received array" },
        { status: 502 }
      );
    }

    // Ensure oddsItem has required fields (id and fixture_id may be missing)
    // Add fixture_id from query if missing, and generate a temporary id if needed
    // fixtureId is already defined above, so we don't need to redefine it
    let oddsWithRequiredFields = oddsItem;
    
    // If oddsItem was already transformed by transformOddsArrayToMarketsFormat,
    // it should already have the correct structure, so we can use it directly
    if (oddsItem && typeof oddsItem === "object" && !Array.isArray(oddsItem)) {
      const oddsObj = oddsItem as Record<string, unknown>;
      
      // Check if it's already in the correct format (has markets array)
      if (Array.isArray(oddsObj.markets)) {
        // Already transformed, just ensure id and fixture_id are set
        oddsWithRequiredFields = {
          ...oddsObj,
          fixture_id: oddsObj.fixture_id ?? fixtureId,
          id: oddsObj.id ?? oddsObj.fixture_id ?? fixtureId,
        };
      } else {
        // Not transformed yet, add required fields
        oddsWithRequiredFields = {
          ...oddsObj,
          fixture_id: oddsObj.fixture_id ?? fixtureId,
          id: oddsObj.id ?? oddsObj.fixture_id ?? fixtureId,
        };
      }
    } else if (Array.isArray(oddsItem)) {
      // fallback: take first element of array and force ids
      const first = oddsItem[0] as Record<string, unknown>;
      oddsWithRequiredFields = {
        ...first,
        fixture_id: first?.fixture_id ?? fixtureId,
        id: first?.id ?? first?.fixture_id ?? fixtureId,
      };
    }

    // Debug: Log structure before validation
    const oddsObj = oddsWithRequiredFields as Record<string, unknown>;
    console.log("[PREMATCH ODDS] Structure before validation:", {
      hasId: !!oddsObj.id,
      hasFixtureId: !!oddsObj.fixture_id,
      idType: typeof oddsObj.id,
      fixtureIdType: typeof oddsObj.fixture_id,
      hasMarkets: Array.isArray(oddsObj.markets),
      marketsCount: Array.isArray(oddsObj.markets) ? oddsObj.markets.length : 0,
      keys: Object.keys(oddsObj),
      firstMarket: Array.isArray(oddsObj.markets) && oddsObj.markets.length > 0 
        ? JSON.stringify(oddsObj.markets[0]).substring(0, 200)
        : "no markets",
    });

    let odds: z.infer<typeof SportMonksOddsSchema>;
    try {
      odds = SportMonksOddsSchema.parse(oddsWithRequiredFields);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error("[PREMATCH ODDS] Zod validation error:", {
          errorCount: validationError.errors.length,
          errors: validationError.errors.map(err => ({
            path: err.path.join("."),
            message: err.message,
            code: err.code,
            received: err.code === "invalid_type" ? err.received : undefined,
            expected: err.code === "invalid_type" ? err.expected : undefined,
          })),
          receivedStructure: {
            id: oddsObj.id,
            fixture_id: oddsObj.fixture_id,
            markets: Array.isArray(oddsObj.markets) 
              ? oddsObj.markets.map((m: unknown) => {
                  const market = m as Record<string, unknown>;
                  return {
                    id: market.id,
                    name: market.name,
                    hasSelections: Array.isArray(market.selections),
                    selectionsCount: Array.isArray(market.selections) ? market.selections.length : 0,
                    firstSelection: Array.isArray(market.selections) && market.selections.length > 0
                      ? market.selections[0]
                      : null,
                  };
                })
              : "not an array",
          },
          fullReceived: JSON.stringify(oddsWithRequiredFields).substring(0, 2000),
        });
      }
      throw validationError;
    }
    
    // Debug: Log raw odds before normalization
    console.log("[PREMATCH ODDS] Raw odds for fixture", fixtureId, ":", {
      marketsCount: odds.markets?.length || 0,
      markets: odds.markets?.map(m => ({
        id: m.id,
        name: m.name || m.market,
        selectionsCount: m.selections?.length || 0,
      })),
    });
    
    const normalized = normalizeOdds(odds);
    
    // Debug: Log normalized odds
    console.log("[PREMATCH ODDS] Normalized odds for fixture", fixtureId, ":", {
      marketsCount: normalized.markets?.length || 0,
      markets: normalized.markets?.slice(0, 10), // First 10 for debugging
    });

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching prematch odds:", error);

    if (error instanceof z.ZodError) {
      // Check if it's a query validation error or response validation error
      const isQueryError = error.errors.some((err) => 
        err.path.length === 1 && err.path[0] === "fixtureId"
      );
      
      if (isQueryError) {
        return NextResponse.json(
          { error: "Invalid query parameters", details: error.errors },
          { status: 400 }
        );
      } else {
        // Response validation error
        return NextResponse.json(
          { error: "Invalid response format from SportMonks API", details: error.errors },
          { status: 502 }
        );
      }
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
      { error: "Failed to fetch prematch odds" },
      { status: 500 }
    );
  }
}

