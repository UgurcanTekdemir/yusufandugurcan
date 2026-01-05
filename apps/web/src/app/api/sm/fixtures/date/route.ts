import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  SportMonksFixtureSchema,
  SportMonksResponseSchema,
} from "@/lib/sportmonks/schemas";
import { normalizeFixtures } from "@/lib/sportmonks/dto";

const QuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  leagueId: z.string().optional(),
});

/**
 * GET /api/sm/fixtures/date?date=YYYY-MM-DD&leagueId=123
 * Fetch fixtures by date (with optional server-side leagueId filtering)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // 1) Query validation -> 400
  let query: z.infer<typeof QuerySchema>;
  try {
    query = QuerySchema.parse({
      date: searchParams.get("date") ?? "",
      leagueId: searchParams.get("leagueId") ?? undefined,
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
    const opts: { include?: string } = {
      include: "participants;league",
    };

    const response = await sportmonksClient.getFixturesByDate(query.date, opts);

    const validated = SportMonksResponseSchema.parse(response);
    const dataArray = Array.isArray(validated.data) ? validated.data : [];
    let fixtures = dataArray.map((item) => SportMonksFixtureSchema.parse(item));

    // Server-side leagueId filtering (if provided)
    if (query.leagueId) {
      const leagueIdNum = Number(query.leagueId);
      if (!isNaN(leagueIdNum)) {
        fixtures = fixtures.filter((fixture) => {
          const fixtureLeagueId = (fixture as unknown as { league_id?: number })?.league_id;
          return fixtureLeagueId === leagueIdNum;
        });
      }
    }

    const normalized = normalizeFixtures(fixtures);

    return NextResponse.json(normalized);
  } catch (e) {
    console.error("SportMonks /fixtures/date failed:", e);

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
      { error: e instanceof Error ? e.message : "Failed to fetch fixtures" },
      { status: 500 }
    );
  }
}
