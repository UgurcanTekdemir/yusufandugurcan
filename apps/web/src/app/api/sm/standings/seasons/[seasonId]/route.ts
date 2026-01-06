import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import { SportMonksCollectionResponseSchema } from "@/lib/sportmonks/schemas";

const ParamsSchema = z.object({
  seasonId: z.string().regex(/^\d+$/, "Season ID must be a number"),
});

const QuerySchema = z.object({
  include: z.string().optional(),
});

/**
 * GET /api/sm/standings/seasons/[seasonId]?include=participant;rule;details.type
 * Fetch standings for a specific season
 * Based on SportMonks API v3 documentation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { seasonId: string } }
) {
  try {
    // Validate route params
    const routeParams = ParamsSchema.parse({ seasonId: params.seasonId });

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      include: searchParams.get("include") || undefined,
    });

    // Build include parameter (default if not provided)
    const include = query.include || "participant;rule;details.type";

    const response = await sportmonksClient.getStandingsBySeason(
      Number(routeParams.seasonId),
      { include }
    );

    // Validate response structure (expecting collection response with data array)
    const validated = SportMonksCollectionResponseSchema.parse(response);

    // Return the standings data (array of standing entries)
    return NextResponse.json({
      data: validated.data,
      // Include pagination if available
      pagination: (validated as Record<string, unknown>).pagination,
    });
  } catch (error) {
    console.error("Error fetching standings:", error);

    if (error instanceof z.ZodError) {
      // Check if it's a route param error or query/response validation error
      const isRouteError = error.errors.some(
        (err) => err.path.length === 1 && err.path[0] === "seasonId"
      );

      if (isRouteError) {
        return NextResponse.json(
          { error: "Invalid season ID", details: error.errors },
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
      { error: "Failed to fetch standings" },
      { status: 500 }
    );
  }
}

