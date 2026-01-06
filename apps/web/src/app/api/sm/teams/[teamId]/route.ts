import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksTeamSchema,
  SportMonksSingleResponseSchema,
} from "@/lib/sportmonks/schemas";

const ParamsSchema = z.object({
  teamId: z.string().regex(/^\d+$/, "Team ID must be a number"),
});

const QuerySchema = z.object({
  include: z.string().optional(),
  filters: z.string().optional(),
  seasonId: z.string().optional(), // Convenience parameter for teamStatisticSeasons filter
});

/**
 * GET /api/sm/teams/[teamId]?include=statistics.details.type&filters=teamStatisticSeasons:21638
 * GET /api/sm/teams/[teamId]?include=statistics.details.type&seasonId=21638
 * Fetch a single team by ID with optional includes and filters
 * Based on SportMonks API v3 documentation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    // Validate route params
    const routeParams = ParamsSchema.parse({ teamId: params.teamId });

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      include: searchParams.get("include") || undefined,
      filters: searchParams.get("filters") || undefined,
      seasonId: searchParams.get("seasonId") || undefined,
    });

    // Build include parameter (default if not provided)
    const include =
      query.include ||
      "statistics.details.type";

    // Build filters parameter
    // If seasonId is provided, use it to build teamStatisticSeasons filter
    let filters = query.filters;
    if (query.seasonId && !filters) {
      filters = `teamStatisticSeasons:${query.seasonId}`;
    }

    const response = await sportmonksClient.getTeamById(
      Number(routeParams.teamId),
      { include, ...(filters ? { filters } : {}) }
    );

    // Validate response structure
    const validated = SportMonksSingleResponseSchema.parse(response);

    // Extract team from data
    const team = SportMonksTeamSchema.parse(validated.data);

    // Return team with additional data if included (statistics, etc.)
    return NextResponse.json({
      ...team,
      // Include raw statistics if they exist in the response
      statistics: (validated.data as Record<string, unknown>).statistics,
    });
  } catch (error) {
    console.error("Error fetching team:", error);

    if (error instanceof z.ZodError) {
      // Check if it's a route param error or query/response validation error
      const isRouteError = error.errors.some(
        (err) => err.path.length === 1 && err.path[0] === "teamId"
      );

      if (isRouteError) {
        return NextResponse.json(
          { error: "Invalid team ID", details: error.errors },
          { status: 400 }
        );
      } else {
        // Response validation error
        return NextResponse.json(
          {
            error: "Invalid response format from SportMonks API",
            details: error.errors,
          },
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
      { error: "Failed to fetch team" },
      { status: 500 }
    );
  }
}

