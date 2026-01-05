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
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  leagueId: z.string().optional(),
  include: z.string().optional(),
});

/**
 * GET /api/sm/fixtures/between?start=2024-01-01&end=2024-01-07&leagueId=123
 * Fetch fixtures between dates
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      start: searchParams.get("start"),
      end: searchParams.get("end"),
      leagueId: searchParams.get("leagueId"),
      include: searchParams.get("include"),
    });

    const params: { leagueId?: number; include?: string } = {
      include: query.include || "participants",
    };
    if (query.leagueId) {
      params.leagueId = Number(query.leagueId);
    }

    const response = await sportmonksClient.getFixturesBetween(
      query.start,
      query.end,
      params
    );
    const validated = SportMonksResponseSchema.parse(response);
    const fixtures = (validated.data as unknown[]).map((item) =>
      SportMonksFixtureSchema.parse(item)
    );
    const normalized = normalizeFixtures(fixtures);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching fixtures between dates:", error);
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

