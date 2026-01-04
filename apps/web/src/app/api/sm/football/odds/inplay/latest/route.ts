import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import { SportMonksResponseSchema } from "@/lib/sportmonks/schemas";
import { withRateLimit } from "@/lib/rateLimit/middleware";

const QuerySchema = z.object({
  locale: z.string().optional(),
});

/**
 * GET /api/sm/football/odds/inplay/latest?locale=en
 * Fetch latest inplay odds (updated in last 10 seconds) from SportMonks API (10s cache)
 */
async function handler(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      locale: searchParams.get("locale") || undefined,
    });

    const response = await sportmonksClient.getInplayOddsLatest(query.locale);
    const validated = SportMonksResponseSchema.parse(response);

    return NextResponse.json(validated.data);
  } catch (error) {
    console.error("Error fetching latest inplay odds:", error);
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
      { error: "Failed to fetch latest inplay odds" },
      { status: 500 }
    );
  }
}

export const GET = withRateLimit(handler);

