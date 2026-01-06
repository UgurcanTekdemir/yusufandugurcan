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
  filters: z.string().optional(), // e.g., "populate", "idAfter:12345", "page:2,per_page:100"
  select: z.string().optional(),
  locale: z.string().optional(),
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
      filters: searchParams.get("filters") ?? undefined,
      select: searchParams.get("select") ?? undefined,
      locale: searchParams.get("locale") ?? undefined,
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
    // Optimize includes: only include what's necessary
    // For bulk fetching, use filters=populate to disable includes and get 1000 per page
    const opts: {
      include?: string;
      filters?: string;
      select?: string;
      locale?: string;
    } = {};

    // If filters=populate is requested, don't include anything (minimal payload)
    if (query.filters?.includes("populate")) {
      // No includes when using populate filter
    } else {
      // Include participants with image_path for team logos
      // Include state to determine if fixture is finished
      // Include scores to show final score for finished matches
      // Some endpoints/relations may not support field selection
      // We'll add field selection later once basic include works
      // 
      // Note: League can be retrieved from cache (see normalizeFixture in dto.ts)
      // So we don't need to include it here
      opts.include = "participants:name,image_path;state;scores";
      
      // Don't use select for now - let's confirm basic include works first
      // We can optimize later
    }

    // Pass through filters, select, locale if provided
    if (query.filters) {
      opts.filters = query.filters;
    }
    if (query.select) {
      opts.select = query.select;
    }
    if (query.locale) {
      opts.locale = query.locale;
    }

    const response = await sportmonksClient.getFixturesByDate(query.date, opts);

    const validated = SportMonksResponseSchema.parse(response);
    const dataArray = Array.isArray(validated.data) ? validated.data : [];
    let fixtures = dataArray.map((item) => SportMonksFixtureSchema.parse(item));

    // Debug: Log raw scores for finished fixtures
    const finishedFixtures = fixtures.filter((f) => {
      const state = typeof f.state === "string" ? f.state : (f.state as { name?: string })?.name;
      return state && ["FT", "FT_PEN", "CANCL", "POSTP", "INT", "ABAN", "SUSP", "AWARDED"].includes(state.toUpperCase());
    });
    if (finishedFixtures.length > 0) {
      const sampleFixture = finishedFixtures[0]!;
      const participants = (sampleFixture as unknown as { participants?: Array<{
        id?: number;
        name?: string;
        meta?: {
          location?: string;
          score?: number;
          winner?: boolean;
          position?: number;
        };
      }> })?.participants || [];
      
      console.log("[FIXTURES/DATE] Sample finished fixture raw data:", JSON.stringify({
        fixtureId: sampleFixture.id,
        state: sampleFixture.state,
        result_info: (sampleFixture as unknown as { result_info?: string })?.result_info,
        scores: sampleFixture.scores,
        participants: participants.map((p) => ({
          id: p.id,
          name: p.name,
          meta: p.meta,
        })),
      }, null, 2));
    }

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

    // Return all fixtures (both active and finished)
    // UI will separate them into "Upcoming" and "Past Matches" sections
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
