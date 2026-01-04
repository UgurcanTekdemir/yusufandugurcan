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
  leagueId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/fixtures?leagueId=123&date=2024-01-01&locale=en
 * GET /api/sm/fixtures?startDate=2024-01-01&endDate=2024-01-03&locale=en
 * Fetch fixtures from SportMonks API (1-5 min cache)
 */
async function handler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      leagueId: searchParams.get("leagueId") || undefined,
      date: searchParams.get("date") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      locale: searchParams.get("locale") || undefined,
    });

    const options = {
      leagueId: query.leagueId ? Number(query.leagueId) : undefined,
      date: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      locale: query.locale,
    };

    const response = await sportmonksClient.getFixtures(options);
    const validated = SportMonksResponseSchema.parse(response);
    const fixtures = (validated.data as unknown[]).map((item) =>
      SportMonksFixtureSchema.parse(item)
    );
    const normalized = normalizeFixtures(fixtures);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching fixtures:", error);
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
      { error: "Failed to fetch fixtures" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);
