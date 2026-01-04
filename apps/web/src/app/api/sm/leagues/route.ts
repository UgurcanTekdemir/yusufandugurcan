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
  countryId: z.string().min(1),
});

/**
 * GET /api/sm/leagues?countryId=123
 * Fetch leagues for a country
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      countryId: searchParams.get("countryId"),
    });

    const response = await sportmonksClient.getLeagues(
      Number(query.countryId)
    );
    const validated = SportMonksResponseSchema.parse(response);
    const leagues = (validated.data as unknown[]).map((item) =>
      SportMonksLeagueSchema.parse(item)
    );
    const normalized = normalizeLeagues(leagues);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching leagues:", error);
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
      { error: "Failed to fetch leagues" },
      { status: 500 }
    );
  }
}

