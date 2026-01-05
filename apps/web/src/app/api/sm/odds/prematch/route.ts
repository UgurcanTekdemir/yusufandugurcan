import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksOddsSchema,
  SportMonksSingleResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeOdds } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  fixtureId: z.string().min(1),
});

/**
 * GET /api/sm/odds/prematch?fixtureId=123
 * Fetch prematch odds for a fixture
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      fixtureId: searchParams.get("fixtureId"),
    });

    const response = await sportmonksClient.getPrematchOdds(
      Number(query.fixtureId)
    );
    const validated = SportMonksSingleResponseSchema.parse(response);
    const odds = SportMonksOddsSchema.parse(validated.data);
    const normalized = normalizeOdds(odds);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching prematch odds:", error);
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
      { error: "Failed to fetch prematch odds" },
      { status: 500 }
    );
  }
}

