import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksSeasonSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeSeasons } from "@/lib/sportmonks/dto";
import { withRateLimit } from "@/lib/rateLimit/middleware";

const QuerySchema = z.object({
  leagueId: z.string().optional(),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/seasons?leagueId=123&locale=en
 * Fetch seasons from SportMonks API (1-5 min cache)
 */
async function handler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      leagueId: searchParams.get("leagueId") || undefined,
      locale: searchParams.get("locale") || undefined,
    });

    const leagueId = query.leagueId ? Number(query.leagueId) : undefined;
    const response = await sportmonksClient.getSeasons(leagueId, query.locale);
    const validated = SportMonksResponseSchema.parse(response);
    const seasons = (validated.data as unknown[]).map((item) =>
      SportMonksSeasonSchema.parse(item)
    );
    const normalized = normalizeSeasons(seasons);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching seasons:", error);
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
      { error: "Failed to fetch seasons" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);
