import "server-only";
import { NextResponse } from "next/server";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksFixtureSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeFixtures } from "@/lib/sportmonks/dto";

/**
 * GET /api/sm/livescores
 * Fetch live scores from SportMonks API
 */
export async function GET() {
  try {
    const response = await sportmonksClient.getLivescores();
    const validated = SportMonksResponseSchema.parse(response);
    const fixtures = (validated.data as unknown[]).map((item) =>
      SportMonksFixtureSchema.parse(item)
    );
    const normalized = normalizeFixtures(fixtures);

    // Filter to only live fixtures (should already be filtered by API, but ensure isLive=true)
    const liveFixtures = normalized.filter((f) => f.isLive);

    return NextResponse.json(liveFixtures);
  } catch (error) {
    console.error("Error fetching livescores:", error);
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch livescores" },
      { status: 500 }
    );
  }
}

