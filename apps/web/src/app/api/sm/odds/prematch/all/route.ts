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
  order: z.enum(["asc", "desc"]).optional(),
  per_page: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  page: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
});

/**
 * GET /api/sm/odds/prematch/all?include=market;bookmaker;fixture&filters=...&order=desc&per_page=30&page=1
 * Fetch all pre-match odds
 * 
 * Query parameters:
 * - include: market, bookmaker, fixture (semicolon-separated)
 * - select: Select specific fields
 * - filters: Filter the response
 * - locale: Translate name fields
 * - order: asc or desc (defaults to asc)
 * - per_page: Results per page (max 50, defaults to 25)
 * - page: Page number for pagination
 * 
 * Response format: Flat array of odds objects, grouped by fixture_id and market_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      include: searchParams.get("include") || undefined,
      select: searchParams.get("select") || undefined,
      filters: searchParams.get("filters") || undefined,
      locale: searchParams.get("locale") || undefined,
      order: searchParams.get("order") || undefined,
      per_page: searchParams.get("per_page") || undefined,
      page: searchParams.get("page") || undefined,
    });

    const response = await sportmonksClient.getAllPrematchOdds({
      include: query.include,
      select: query.select,
      filters: query.filters,
      locale: query.locale,
      order: query.order,
      per_page: query.per_page,
      page: query.page,
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
    console.error("Error fetching all prematch odds:", error);

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
      { error: error instanceof Error ? error.message : "Failed to fetch all prematch odds" },
      { status: 500 }
    );
  }
}

