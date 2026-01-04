import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksFixtureSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeFixtures } from "@/lib/sportmonks/dto";
import { withRateLimit } from "@/lib/rateLimit/middleware";

const QuerySchema = z.object({
  locale: z.string().optional(),
});

/**
 * GET /api/sm/livescores?locale=en
 * Fetch live scores from SportMonks API (10-30s cache)
 */
async function handler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      locale: searchParams.get("locale") || undefined,
    });

    const response = await sportmonksClient.getLivescoresInplay(query.locale);
    const validated = SportMonksResponseSchema.parse(response);
    const fixtures = (validated.data as unknown[]).map((item) => {
      try {
        return SportMonksFixtureSchema.parse(item);
      } catch (parseError) {
        // Log raw item for debugging nullable fields
        if (parseError instanceof z.ZodError) {
          console.warn("Fixture validation error (nullable fields now supported):", {
            item: JSON.stringify(item),
            errors: parseError.errors,
          });
        }
        throw parseError;
      }
    });
    const normalized = normalizeFixtures(fixtures);

    // Filter to only live fixtures (should already be filtered by API, but ensure isLive=true)
    const liveFixtures = normalized.filter((f) => f.isLive);

    return NextResponse.json(liveFixtures);
  } catch (error) {
    console.error("Error fetching livescores:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
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

export const GET = withRateLimit(handler);
