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
 * GET /api/sm/livescores/latest?include=participants:name,image_path;scores&filters=fixtureLeagues:501,271
 * Fetch latest updated livescores (updated within last 10 seconds)
 * 
 * Definition of "Latest Updated":
 * Returns all fixtures whose livescore data has changed within the last 10 seconds.
 * The update window is fixed at 10 seconds and cannot be altered.
 * 
 * Tracked Fields (8 fields monitored for changes):
 * - state_id: Match phase progressed (e.g., 1→2 at kick-off, 2→3 at half-time)
 * - venue_id: Assigned venue was updated (e.g., moved from stadium A to stadium B)
 * - name: Fixture name text was modified (e.g., team abbreviations or formatting changed)
 * - starting_at: Kick-off time string was rescheduled (e.g., "2024-08-04 15:30:00" to "2024-08-04 16:00:00")
 * - starting_at_timestamp: UNIX timestamp for kick-off was rescheduled (e.g., 1722785400 to 1722787200)
 * - result_info: Score summary text was updated (e.g., "0-0" to "1-0")
 * - leg: Leg designation changed (e.g., "1/2" to "2/2")
 * - length: Fixture duration changed (e.g., 90 to 120 when extra time is added)
 * 
 * Note: Only these 8 fields are monitored. Changes in other data (events, lineups, odds, statistics)
 * do not count toward triggering this endpoint.
 * 
 * Update Behavior:
 * - If no fixtures changed during the 10-second window, returns 200 OK with "data": []
 * - Empty array response is normal and indicates no updates
 * - Updates usually arrive in small batches
 * - If multiple changes occur to the same fixture within 10 seconds, you may only see the final state
 * 
 * Polling Strategy & Best Practices:
 * - Recommended polling interval: 5-8 seconds (as long as rate limits permit)
 * - If you detect many consecutive empty responses, consider backing off
 * - Always dedupe via cache: ignore fixtures whose tracked fields haven't changed
 * - Use exponential backoff or pauses when encountering errors
 * - Pay attention to clock skew and network jitter
 * 
 * Caching & Diff Logic:
 * - Cache should store for each fixture the current values of the 8 tracked fields
 * - Compare each field with cached version on each poll
 * - If no differences → skip
 * - If any difference → process as update and overwrite cache
 * 
 * Query parameters:
 * - include: sport, round, stage, group, aggregate, league, season, coaches, tvStations, venue, state, weatherReport, lineups, events, timeline, comments, trends, statistics, periods, participants, odds, premiumOdds, inplayOdds, prematchNews, postmatchNews, metadata, sidelined, predictions, referees, formations, ballCoordinates, scores, xGFixture, expectedLineups (semicolon-separated)
 * - select: Select specific fields on the base entity
 * - filters: Static filters (ParticipantSearch, todayDate, venues, IsDeleted) or dynamic filters (types, states, leagues, groups, countries, seasons)
 *   - Static filters: ParticipantSearch:Celtic | todayDate | venues:10,12 | IsDeleted
 *   - Dynamic filters: fixtureLeagues:501,271 | fixtureStates:1 | statisticTypes:42,49 | eventTypes:14
 * - locale: Translate name fields
 * 
 * Response format: Array of fixture objects (empty array if no updates)
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

    // Optimized default include: participants with image_path for team logos, periods for live time
    const include = query.include || "participants:name,short_code,image_path;periods";

    const response = await sportmonksClient.getLivescoresLatest({
      include,
      select: query.select,
      filters: query.filters,
      locale: query.locale,
    });

    // Validate response structure
    const validated = SportMonksResponseSchema.parse(response);
    
    // Handle both array and single object responses
    // Note: Empty array is normal and indicates no updates in the last 10 seconds
    let fixtures: unknown[];
    if (Array.isArray(validated.data)) {
      fixtures = validated.data;
    } else if (validated.data && typeof validated.data === "object") {
      // Single fixture object wrapped in data
      fixtures = [validated.data];
    } else {
      // Empty response - no updates in last 10 seconds (this is normal)
      fixtures = [];
    }

    // If no fixtures, return empty array (normal behavior - no updates in last 10 seconds)
    if (fixtures.length === 0) {
      return NextResponse.json([]);
    }

    const parsedFixtures = fixtures.map((item) =>
      SportMonksFixtureSchema.parse(item)
    );
    const normalized = normalizeLiveFixtures(parsedFixtures);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching livescores latest:", error);

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

