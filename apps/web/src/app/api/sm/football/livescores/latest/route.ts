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
 * GET /api/sm/football/livescores/latest?locale=en
 * Fetch latest live scores (updated in last 10 seconds) from SportMonks API (10s cache)
 */
async function handler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      locale: searchParams.get("locale") || undefined,
    });

    const response = await sportmonksClient.getLivescoresLatest(query.locale);
    const validated = SportMonksResponseSchema.parse(response);
    const fixtures = (validated.data as unknown[]).map((item) =>
      SportMonksFixtureSchema.parse(item)
    );
    const normalized = normalizeFixtures(fixtures);

    // Filter to only live fixtures
    const liveFixtures = normalized.filter((f) => f.isLive);

    return NextResponse.json(liveFixtures);
  } catch (error) {
    console.error("Error fetching latest livescores:", error);
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
      { error: "Failed to fetch latest livescores" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);

