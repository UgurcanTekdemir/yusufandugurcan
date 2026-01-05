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
  countryId: z
    .string()
    .min(1, "countryId is required")
    .regex(/^\d+$/, "countryId must be a positive integer")
    .transform((val) => Number(val))
    .pipe(z.number().int().positive("countryId must be a positive integer")),
  include: z.string().optional(),
});

/**
 * GET /api/sm/sidebar/leagues?countryId=2
 * Fetch leagues for a country
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // 1) Query validation -> 400
  let query: z.infer<typeof QuerySchema>;
  try {
    query = QuerySchema.parse({
      countryId: searchParams.get("countryId") ?? "",
      include: searchParams.get("include") ?? undefined,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: e.errors },
        { status: 400 }
      );
    }
    throw e;
  }

  // 2) Upstream call + response validation
  try {
    const countryId = query.countryId;
    const include = query.include || "country";

    const response = await sportmonksClient.getLeaguesByCountryId(countryId, {
      include,
    });

    const validated = SportMonksResponseSchema.parse(response);
    const dataArray = Array.isArray(validated.data) ? validated.data : [];
    const leagues = dataArray.map((item) => SportMonksLeagueSchema.parse(item));
    const normalized = normalizeLeagues(leagues);

    return NextResponse.json(normalized);
  } catch (e) {
    console.error("SportMonks /leagues failed:", e);

    // Parse upstream error status if available
    if (e instanceof Error && e.message.startsWith("SportMonks ")) {
      const match = e.message.match(/SportMonks (\d+): (.+)/);
      if (match) {
        const status = parseInt(match[1]!, 10);
        const body = match[2]!;
        return NextResponse.json(
          { error: `Upstream error: ${e.message}`, upstream: body },
          { status }
        );
      }
    }

    // Upstream schema bozulduysa bu kullanıcı hatası değil:
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Upstream response schema mismatch", details: e.errors },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch leagues" },
      { status: 500 }
    );
  }
}
