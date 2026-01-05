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
  query: z.string().min(1, "Query is required"),
  locale: z.string().optional(),
});

/**
 * GET /api/sm/sidebar/leagues/search?query=premier
 * Search leagues
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryParams = QuerySchema.parse({
      query: searchParams.get("query"),
      locale: searchParams.get("locale"),
    });

    const params: { locale?: string } = {};
    if (queryParams.locale) {
      params.locale = queryParams.locale;
    }

    const response = await sportmonksClient.searchLeagues(
      queryParams.query,
      Object.keys(params).length > 0 ? params : undefined
    );
    const validated = SportMonksResponseSchema.parse(response);
    const leagues = (validated.data as unknown[]).map((item) =>
      SportMonksLeagueSchema.parse(item)
    );
    const normalized = normalizeLeagues(leagues);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error searching leagues:", error);
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
      { error: "Failed to search leagues" },
      { status: 500 }
    );
  }
}

