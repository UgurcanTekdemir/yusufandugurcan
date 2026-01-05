import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksFixtureSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeLiveFixtures } from "@/lib/sportmonks/dto";

/**
 * GET /api/sm/livescores/latest?include=participants,scores
 * Fetch latest live scores from SportMonks API
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const include = searchParams.get("include") || "participants";

    const params: { include?: string } = { include };

    const response = await sportmonksClient.getLivescoresLatest(params);
    const validated = SportMonksResponseSchema.parse(response);
    const fixtures = (validated.data as unknown[]).map((item) =>
      SportMonksFixtureSchema.parse(item)
    );
    const normalized = normalizeLiveFixtures(fixtures);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching livescores latest:", error);
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

