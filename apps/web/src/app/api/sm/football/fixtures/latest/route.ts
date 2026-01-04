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
  since: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/football/fixtures/latest?since=timestamp&locale=en
 * Fetch latest fixtures (updated in last 10 seconds) from SportMonks API (10-30s cache)
 */
async function handler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      since: searchParams.get("since") || undefined,
      locale: searchParams.get("locale") || undefined,
    });

    const response = await sportmonksClient.getFixturesLatest(query.since, query.locale);
    const validated = SportMonksResponseSchema.parse(response);
    const fixtures = (validated.data as unknown[]).map((item) =>
      SportMonksFixtureSchema.parse(item)
    );
    const normalized = normalizeFixtures(fixtures);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching latest fixtures:", error);
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
      { error: "Failed to fetch latest fixtures" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);

