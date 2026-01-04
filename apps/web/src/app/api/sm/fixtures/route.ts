import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksFixtureSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeFixtures } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  leagueId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * GET /api/sm/fixtures?leagueId=123&date=2024-01-01
 * Fetch fixtures for a league/date
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      leagueId: searchParams.get("leagueId"),
      date: searchParams.get("date"),
    });

    const response = await sportmonksClient.getFixtures(
      Number(query.leagueId),
      query.date
    );
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

