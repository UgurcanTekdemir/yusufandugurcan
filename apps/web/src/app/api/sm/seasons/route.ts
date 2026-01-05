import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksSeasonSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeSeasons } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  leagueId: z.string().min(1),
});

/**
 * GET /api/sm/seasons?leagueId=123
 * Fetch seasons for a league
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      leagueId: searchParams.get("leagueId"),
    });

    const response = await sportmonksClient.getSeasons(
      Number(query.leagueId)
    );
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

