import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksFixtureSchema,
  SportMonksSingleResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeFixture } from "@/lib/sportmonks/dto";

const ParamsSchema = z.object({
  fixtureId: z.string().regex(/^\d+$/, "Fixture ID must be a number"),
});

const QuerySchema = z.object({
  include: z.string().optional(),
  select: z.string().optional(),
  filters: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/fixtures/[fixtureId]?include=statistics.type;lineups.details.type;events.type
 * Fetch a single fixture by ID with optional includes
 * Based on SportMonks API v3 documentation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fixtureId: string } }
) {
  try {
    // Validate route params
    const routeParams = ParamsSchema.parse({ fixtureId: params.fixtureId });

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      include: searchParams.get("include") || undefined,
      select: searchParams.get("select") || undefined,
      filters: searchParams.get("filters") || undefined,
      locale: searchParams.get("locale") || undefined,
    });

    // Start with minimal includes to avoid 400 Bad Request errors
    // Include participants with image_path for team logos
    // If user provides include, use it; otherwise try minimal default
    // If that fails, we'll try without includes
    const include = query.include || "participants:name,image_path";

    // Don't use select for now - let's see if basic include works first
    // We can add select optimization later once includes work
    const select = query.select;

    let response: unknown;
    try {
      response = await sportmonksClient.getFixtureById(
        Number(routeParams.fixtureId),
        {
          include,
          select,
          filters: query.filters,
          locale: query.locale,
        }
      );
    } catch (error) {
      // If we get a 400 error and we're using default include, try without include
      if (
        error instanceof Error &&
        error.message.includes("400") &&
        !query.include
      ) {
        console.log(
          `[fixtures/${routeParams.fixtureId}] Default include failed, retrying without include`
        );
        response = await sportmonksClient.getFixtureById(
          Number(routeParams.fixtureId),
          {
            select,
            filters: query.filters,
            locale: query.locale,
          }
        );
      } else {
        throw error;
      }
    }

    // Validate response structure
    const validated = SportMonksSingleResponseSchema.parse(response);

    // Extract fixture from data
    const fixture = SportMonksFixtureSchema.parse(validated.data);

    // Normalize fixture
    const normalized = normalizeFixture(fixture);

    // Return normalized fixture with additional data if included
    return NextResponse.json({
      ...normalized,
      // Include raw statistics, lineups, events if they exist in the response
      statistics: (validated.data as Record<string, unknown>).statistics,
      lineups: (validated.data as Record<string, unknown>).lineups,
      events: (validated.data as Record<string, unknown>).events,
    });
  } catch (error) {
    console.error("Error fetching fixture:", error);

    if (error instanceof z.ZodError) {
      // Check if it's a route param error or query/response validation error
      const isRouteError = error.errors.some(
        (err) => err.path.length === 1 && err.path[0] === "fixtureId"
      );

      if (isRouteError) {
        return NextResponse.json(
          { error: "Invalid fixture ID", details: error.errors },
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
      { error: "Failed to fetch fixture" },
      { status: 500 }
    );
  }
}

