import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksLeagueSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeLeagues } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

/**
 * GET /api/sm/sidebar/leagues/today?date=2024-01-01
 * Fetch leagues with matches today
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      date: searchParams.get("date"),
    });

    const response = await sportmonksClient.getLeaguesByDate(query.date);
    const validated = SportMonksResponseSchema.parse(response);
    const leagues = (validated.data as unknown[]).map((item) =>
      SportMonksLeagueSchema.parse(item)
    );
    const normalized = normalizeLeagues(leagues);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching today leagues:", error);
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
      { error: "Failed to fetch today leagues" },
      { status: 500 }
    );
  }
}

