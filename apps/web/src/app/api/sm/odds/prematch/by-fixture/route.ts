import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import { SportMonksOddsSchema } from "@/lib/sportmonks/schemas";
import { normalizeOdds } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  fixtureId: z.string().min(1, "fixtureId is required"),
  bookmakerId: z.string().optional(),
});

/**
 * GET /api/sm/odds/prematch/by-fixture?fixtureId=123&bookmakerId=2
 * Fetch pre-match odds for a fixture from a specific bookmaker (default: bet365, ID: 2)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      fixtureId: searchParams.get("fixtureId"),
      bookmakerId: searchParams.get("bookmakerId"),
    });

    const bookmakerId = query.bookmakerId
      ? Number(query.bookmakerId)
      : 2; // Default to bet365

    const response = await sportmonksClient.getOddsPrematchByFixture(
      Number(query.fixtureId),
      bookmakerId
    );

    // For single fixture odds, the response structure may differ
    // Check if it's wrapped in a data array or a single object
    const oddsData = (response as { data?: unknown } | unknown[]);
    let oddsItem: unknown;

    if (Array.isArray(oddsData)) {
      oddsItem = oddsData[0];
    } else if (oddsData && typeof oddsData === "object" && "data" in oddsData) {
      const data = oddsData.data;
      oddsItem = Array.isArray(data) ? data[0] : data;
    } else {
      oddsItem = oddsData;
    }

    const parsed = SportMonksOddsSchema.parse(oddsItem);
    const normalized = normalizeOdds(parsed);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching odds by fixture:", error);
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
      { error: "Failed to fetch odds" },
      { status: 500 }
    );
  }
}

