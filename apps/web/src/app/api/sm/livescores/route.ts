import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksFixtureSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeLiveFixtures } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  include: z.string().optional(),
  select: z.string().optional(),
  filters: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/livescores?include=participants:name,image_path;scores&filters=fixtureLeagues:501,271
 * Fetch all livescores (15 minutes before start, 15 minutes after finish)
 * 
 * Query parameters:
 * - include: sport, round, stage, group, aggregate, league, season, coaches, tvStations, venue, state, weatherReport, lineups, events, timeline, comments, trends, statistics, periods, participants, odds, premiumOdds, inplayOdds, prematchNews, postmatchNews, metadata, sidelined, predictions, referees, formations, ballCoordinates, scores, xGFixture, expectedLineups (semicolon-separated)
 * - select: Select specific fields on the base entity
 * - filters: Static filters (ParticipantSearch, todayDate, venues, IsDeleted) or dynamic filters (types, states, leagues, groups, countries, seasons)
 *   - Static filters: ParticipantSearch:Celtic | todayDate | venues:10,12 | IsDeleted
 *   - Dynamic filters: fixtureLeagues:501,271 | fixtureStates:1 | statisticTypes:42,49 | eventTypes:14
 * - locale: Translate name fields
 * 
 * Response format: Array of fixture objects
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

    // Optimized default include: participants with image_path for team logos, scores, periods for live time
    // Note: periods must be included separately, not with field selection
    const include = query.include || "participants:name,short_code,image_path;scores;periods";

    const response = await sportmonksClient.getLivescores({
      include,
      select: query.select,
      filters: query.filters,
      locale: query.locale,
    });

    // Validate response structure
    const validated = SportMonksResponseSchema.parse(response);
    
    // Handle both array and single object responses
    let fixtures: unknown[];
    if (Array.isArray(validated.data)) {
      fixtures = validated.data;
    } else if (validated.data && typeof validated.data === "object") {
      // Single fixture object wrapped in data
      fixtures = [validated.data];
    } else {
      fixtures = [];
    }

    const parsedFixtures = fixtures.map((item) =>
      SportMonksFixtureSchema.parse(item)
    );
    const normalized = normalizeLiveFixtures(parsedFixtures);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching livescores:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid query parameters or upstream response schema mismatch",
          details: error.errors,
        },
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
      { error: "Failed to fetch livescores" },
      { status: 500 }
    );
  }
}

