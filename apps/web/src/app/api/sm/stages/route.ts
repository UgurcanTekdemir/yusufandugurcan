import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksStageSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeStages } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  seasonId: z.string().min(1),
});

/**
 * GET /api/sm/stages?seasonId=123
 * Fetch stages for a season
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = QuerySchema.parse({
      seasonId: searchParams.get("seasonId"),
    });

    const response = await sportmonksClient.getStages(
      Number(query.seasonId)
    );
    const validated = SportMonksResponseSchema.parse(response);
    const stages = (validated.data as unknown[]).map((item) =>
      SportMonksStageSchema.parse(item)
    );
    const normalized = normalizeStages(stages);

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching stages:", error);
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
      { error: "Failed to fetch stages" },
      { status: 500 }
    );
  }
}

