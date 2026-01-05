import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksOddsSchema,
  SportMonksSingleResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeOdds } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  fixtureId: z.string().min(1),
});

/**
 * GET /api/sm/odds/prematch?fixtureId=123
 * Fetch prematch odds for a fixture
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      fixtureId: searchParams.get("fixtureId") ?? "",
    });

    const response = await sportmonksClient.getPrematchOdds(
      Number(query.fixtureId)
    );

    // SportMonks API may return either { data: {...} } or { data: [...] } or directly an array
    // Handle different response formats (similar to by-fixture route)
    let oddsItem: unknown;

    if (Array.isArray(response)) {
      // Direct array response: take first element
      if (response.length === 0) {
        return NextResponse.json(
          { error: "No odds found for this fixture" },
          { status: 404 }
        );
      }
      oddsItem = response[0];
    } else if (response && typeof response === "object" && "data" in response) {
      // Response with data wrapper
      const data = (response as { data: unknown }).data;
      // Data can be an array or a single object
      if (Array.isArray(data)) {
        if (data.length === 0) {
          return NextResponse.json(
            { error: "No odds found for this fixture" },
            { status: 404 }
          );
        }
        oddsItem = data[0];
      } else {
        oddsItem = data;
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
    const fixtureId = Number(query.fixtureId);
    let oddsWithRequiredFields = oddsItem;
    
    if (oddsItem && typeof oddsItem === "object" && !Array.isArray(oddsItem)) {
      const oddsObj = oddsItem as Record<string, unknown>;
      // Add fixture_id if missing
      if (!("fixture_id" in oddsObj)) {
        oddsWithRequiredFields = {
          ...oddsObj,
          fixture_id: fixtureId,
        };
      }
      // Add id if missing (use fixture_id as id)
      if (!("id" in oddsObj)) {
        oddsWithRequiredFields = {
          ...(oddsWithRequiredFields as Record<string, unknown>),
          id: (oddsWithRequiredFields as Record<string, unknown>).fixture_id || fixtureId,
        };
      }
    }

    const odds = SportMonksOddsSchema.parse(oddsWithRequiredFields);
    const normalized = normalizeOdds(odds);

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

