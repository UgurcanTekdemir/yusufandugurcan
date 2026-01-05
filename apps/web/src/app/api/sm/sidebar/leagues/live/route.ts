import "server-only";
import { NextResponse } from "next/server";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksLeagueSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeLeagues } from "@/lib/sportmonks/dto";

/**
 * GET /api/sm/sidebar/leagues/live
 * Fetch live leagues from SportMonks API
 */
export async function GET() {
  try {
    const response = await sportmonksClient.getLeaguesLive();
    const validated = SportMonksResponseSchema.parse(response);
    const leagues = (validated.data as unknown[]).map((item) =>
      SportMonksLeagueSchema.parse(item)
    );
    const normalized = normalizeLeagues(leagues);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching live leagues:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch live leagues" },
      { status: 500 }
    );
  }
}

