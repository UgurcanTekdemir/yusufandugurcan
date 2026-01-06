import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sportmonksClient } from "@/lib/sportmonks/client";
import {
  cacheAllCountries,
  cacheAllStates,
  cacheAllTypes,
  getAllCachedCountries,
  getAllCachedStates,
  getAllCachedTypes,
} from "@/lib/sportmonks/referenceCache";

const QuerySchema = z.object({
  entity: z.enum(["countries", "states", "types"]),
  refresh: z.string().optional().transform((val) => val === "true"),
});

/**
 * GET /api/sm/reference?entity=countries&refresh=true
 * Fetch and cache reference entities (countries, states, types)
 * These entities rarely change, so caching them reduces includes in other requests
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  let query: z.infer<typeof QuerySchema>;
  try {
    query = QuerySchema.parse({
      entity: searchParams.get("entity") ?? undefined,
      refresh: searchParams.get("refresh") ?? undefined,
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

  try {
    const { entity, refresh } = query;

    // Check cache first (unless refresh is requested)
    if (!refresh) {
      if (entity === "countries") {
        const cached = getAllCachedCountries();
        if (cached) {
          return NextResponse.json({ data: cached, cached: true });
        }
      } else if (entity === "states") {
        const cached = getAllCachedStates();
        if (cached) {
          return NextResponse.json({ data: cached, cached: true });
        }
      } else if (entity === "types") {
        const cached = getAllCachedTypes();
        if (cached) {
          return NextResponse.json({ data: cached, cached: true });
        }
      }
    }

    // Fetch from API
    let response: unknown;
    if (entity === "countries") {
      // Use core endpoint for countries
      const result = await sportmonksClient.getLeaguesByCountryId(0, {
        // This is a placeholder - we need a proper countries endpoint
        // For now, return empty or use a different approach
      });
      response = result;
    } else if (entity === "states") {
      // Fetch states from SportMonks
      // Note: Actual endpoint may vary - check SportMonks docs
      response = { data: [] }; // Placeholder
    } else if (entity === "types") {
      // Fetch types from SportMonks
      // Note: Actual endpoint may vary - check SportMonks docs
      response = { data: [] }; // Placeholder
    } else {
      return NextResponse.json(
        { error: `Unknown entity: ${entity}` },
        { status: 400 }
      );
    }

    // Cache the results
    const data = (response as { data?: unknown[] })?.data || [];
    if (entity === "countries") {
      cacheAllCountries(data as Array<{ id: number; name: string; [key: string]: unknown }>);
    } else if (entity === "states") {
      cacheAllStates(data as Array<{ id: number; name: string; [key: string]: unknown }>);
    } else if (entity === "types") {
      cacheAllTypes(data as Array<{ id: number; name: string; [key: string]: unknown }>);
    }

    return NextResponse.json({ data, cached: false });
  } catch (e) {
    console.error(`[Reference Cache] Failed to fetch ${query.entity}:`, e);

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

    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch reference data" },
      { status: 500 }
    );
  }
}

