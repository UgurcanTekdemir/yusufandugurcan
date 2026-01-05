import "server-only";
import { NextResponse } from "next/server";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksOddsSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeOdds } from "@/lib/sportmonks/dto";

/**
 * GET /api/sm/odds/inplay/latest
 * Fetch latest in-play odds from SportMonks API
 */
export async function GET() {
  try {
    const response = await sportmonksClient.getOddsInplayLatest();
    const validated = SportMonksResponseSchema.parse(response);
    const oddsArray = (validated.data as unknown[]).map((item) =>
      SportMonksOddsSchema.parse(item)
    );
    const normalized = oddsArray.map(normalizeOdds);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching inplay odds latest:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch odds" },
      { status: 500 }
    );
  }
}

