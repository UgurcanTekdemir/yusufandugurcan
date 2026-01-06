"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FixtureDTO, OddsDTO, MarketOdds } from "@repo/shared/types";
import { Skeleton } from "../ui/Skeleton";
import { useBetslipStore, type BetslipSelection } from "@/stores/betslipStore";
import { getMarketLabel, getSelectionLabel } from "@/stores/betslipUtils";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth/useAuth";

interface FixturesListProps {
  leagueId?: string | null;
  date?: string | null;
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Fetch fixtures for next 3 days (today + 2 days ahead)
async function fetchFixtures(
  leagueId?: string,
  date?: string | null
): Promise<FixtureDTO[]> {
  // If specific date provided, only fetch that date
  if (date) {
    const params = new URLSearchParams();
    if (leagueId) {
      params.set("leagueId", leagueId);
    }
    params.set("date", date);
    
    const response = await fetch(`/api/sm/fixtures/date?${params.toString()}`);
    if (!response.ok) {
      // Try to parse error message from API response
      let errorMessage = "Failed to fetch fixtures";
      try {
        const errorData = await response.json();
        errorMessage = errorData?.error || errorData?.message || errorMessage;
        // Include upstream error if available
        if (errorData?.upstream) {
          errorMessage += `: ${errorData.upstream}`;
        }
        // Include validation details if available
        if (errorData?.details && Array.isArray(errorData.details)) {
          const validationErrors = errorData.details
            .map((err: { path?: string[]; message?: string }) => {
              const path = err.path?.join(".") || "unknown";
              return `${path}: ${err.message || "validation error"}`;
            })
            .join("; ");
          if (validationErrors) {
            errorMessage += ` (${validationErrors})`;
          }
        }
      } catch {
        // If JSON parsing fails, use status text
        errorMessage = `Failed to fetch fixtures: ${response.status} ${response.statusText}`;
      }
      const error = new Error(errorMessage) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  // Otherwise, fetch next 3 days (today + 2 days ahead)
  // Optimized: Use field selection to reduce payload size
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = 0; i < 3; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split("T")[0]!);
  }

  // Fetch fixtures for all 3 days in parallel
  // Optimized: Field selection is already applied in the API route
  // The route uses: select="id,name,starting_at,state,scores" and 
  // include="participants:name,short_code,image_path;league:name"
  const fetchPromises = dates.map(async (dateStr) => {
    const params = new URLSearchParams();
    if (leagueId) {
      params.set("leagueId", leagueId);
    }
    params.set("date", dateStr);
    // Field selection is handled by the API route automatically
    // But we can explicitly request it if needed:
    // params.set("select", "id,name,starting_at,state,scores");
    
    const response = await fetch(`/api/sm/fixtures/date?${params.toString()}`);
    if (!response.ok) {
      // Don't throw error for individual date failures, just return empty array
      // But log the error for debugging
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData?.error || errorData?.message || errorMessage;
      } catch {
        errorMessage = `${response.status} ${response.statusText}`;
      }
      console.warn(`Failed to fetch fixtures for date ${dateStr}: ${errorMessage}`);
      return [] as FixtureDTO[];
    }
    return response.json() as Promise<FixtureDTO[]>;
  });

  const results = await Promise.all(fetchPromises);
  
  // Combine all fixtures and remove duplicates (by fixtureId)
  const allFixtures = results.flat();
  const uniqueFixtures = Array.from(
    new Map(allFixtures.map(fixture => [fixture.fixtureId, fixture])).values()
  );

  // Sort by kickoff time
  return uniqueFixtures.sort((a, b) => {
    const dateA = typeof a.kickoffAt === "string" ? new Date(a.kickoffAt) : a.kickoffAt;
    const dateB = typeof b.kickoffAt === "string" ? new Date(b.kickoffAt) : b.kickoffAt;
    return dateA.getTime() - dateB.getTime();
  });
}

// Fetch odds for a fixture (default to Bet365 - bookmaker ID: 2)
async function fetchOdds(fixtureId: string | number): Promise<OddsDTO> {
  const response = await fetch(`/api/sm/odds/prematch?fixtureId=${fixtureId}&filters=bookmakers:2`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    
    // Build detailed error message
    let errorMessage = errorData?.error || `HTTP ${response.status}`;
    
    // If there are validation details, add them
    if (errorData?.details && Array.isArray(errorData.details)) {
      const validationErrors = errorData.details
        .map((err: { path?: string[]; message?: string }) => {
          const path = err.path?.join(".") || "unknown";
          return `${path}: ${err.message || "validation error"}`;
        })
        .join("; ");
      if (validationErrors) {
        errorMessage += ` (${validationErrors})`;
      }
    }
    
    // Add upstream error if available
    if (errorData?.upstream) {
      errorMessage += ` - Upstream: ${errorData.upstream}`;
    }
    
    throw new Error(`Failed to fetch odds: ${errorMessage}`);
  }
  return response.json();
}

// Get current date in Turkey timezone (Europe/Istanbul)
function getTurkeyDate(): Date {
  const now = new Date();
  // Convert to Turkey timezone
  const turkeyTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Istanbul" }));
  return turkeyTime;
}

// Format kickoff time in Turkey timezone (Europe/Istanbul)
function formatKickoffTime(kickoffAt: Date | string): string {
  try {
    const date = typeof kickoffAt === "string" ? new Date(kickoffAt) : kickoffAt;
    
    // Get current date in Turkey timezone
    const now = getTurkeyDate();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Convert fixture date to Turkey timezone for comparison
    const fixtureDateStr = date.toLocaleString("en-US", { timeZone: "Europe/Istanbul" });
    const fixtureDate = new Date(fixtureDateStr);
    const fixtureDateOnly = new Date(
      fixtureDate.getFullYear(),
      fixtureDate.getMonth(),
      fixtureDate.getDate()
    );
    
    const diffDays = Math.floor(
      (fixtureDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Format time in Turkey timezone
    const timeStr = date.toLocaleTimeString("tr-TR", {
      timeZone: "Europe/Istanbul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (diffDays === 0) {
      return `Bugün ${timeStr}`;
    } else if (diffDays === 1) {
      return `Yarın ${timeStr}`;
    } else if (diffDays === -1) {
      return `Dün ${timeStr}`;
    } else {
      // Format date in Turkish with Turkey timezone
      const dateStr = date.toLocaleDateString("tr-TR", {
        timeZone: "Europe/Istanbul",
        month: "short",
        day: "numeric",
      });
      return `${dateStr} ${timeStr}`;
    }
  } catch {
    return "TBD";
  }
}

// Filter odds by market type
function filterOddsByMarket(
  markets: MarketOdds[],
  marketType: string
): MarketOdds[] {
  return markets.filter(
    (m) => m.market.toLowerCase() === marketType.toLowerCase()
  );
}

// Get 1X2 odds
function get1X2Odds(markets: MarketOdds[]): {
  home?: number;
  draw?: number;
  away?: number;
} {
  const market1X2 = filterOddsByMarket(markets, "1X2");
  const odds: { home?: number; draw?: number; away?: number } = {};

  for (const market of market1X2) {
    const selection = market.selection.toLowerCase().trim();
    // Support multiple formats: "1"/"X"/"2", "Home"/"Draw"/"Away", etc.
    if (selection === "1" || selection === "home" || selection.startsWith("1")) {
      odds.home = market.odds;
    } else if (selection === "x" || selection === "draw") {
      odds.draw = market.odds;
    } else if (selection === "2" || selection === "away" || selection.startsWith("2")) {
      odds.away = market.odds;
    }
  }

  return odds;
}

// Get OU odds (prefer line 2.5 if available, else first OU)
function getOUOdds(markets: MarketOdds[]): {
  over?: number;
  under?: number;
  marketKey?: string;
} {
  const ouMarkets = markets.filter((m) => m.template === "ou");
  const preferred =
    ouMarkets.find((m) => m.market.toLowerCase() === "ou2.5" || m.line === 2.5) ||
    ouMarkets[0];

  const odds: { over?: number; under?: number; marketKey?: string } = {};
  if (preferred) {
    const selection = preferred.selection.toLowerCase().trim();
    odds.marketKey = preferred.market;
    // Support "Over"/"Under" (normalized) and "over"/"under" (raw)
    if (selection === "over" || selection.startsWith("over")) {
      odds.over = preferred.odds;
    }
    if (selection === "under" || selection.startsWith("under")) {
      odds.under = preferred.odds;
    }
  }

  return odds;
}

// Get BTTS odds
function getBTTSOdds(markets: MarketOdds[]): {
  yes?: number;
  no?: number;
} {
  const marketBTTS = filterOddsByMarket(markets, "BTTS");
  const odds: { yes?: number; no?: number } = {};

  for (const market of marketBTTS) {
    const selection = market.selection.toLowerCase().trim();
    // Support "Yes"/"No" (normalized) and "yes"/"no" (raw)
    if (selection === "yes" || selection === "y") {
      odds.yes = market.odds;
    } else if (selection === "no" || selection === "n") {
      odds.no = market.odds;
    }
  }

  return odds;
}

interface FixtureRowProps {
  fixture: FixtureDTO;
  isExpanded: boolean;
  onToggle: () => void;
  onAddSelection: (selection: BetslipSelection) => void;
}

function FixtureRow({ fixture, isExpanded, onToggle, onAddSelection }: FixtureRowProps) {
  const { user } = useAuth();
  const router = useRouter();
  
  // Fetch odds (always fetch for 1X2 display on main page, expanded state for more markets)
  const {
    data: oddsData,
    isLoading: isLoadingOdds,
    isError: isErrorOdds,
    error: oddsError,
  } = useQuery<OddsDTO, Error>({
    queryKey: ["odds", "prematch", fixture.fixtureId],
    queryFn: () => fetchOdds(fixture.fixtureId),
    enabled: true, // Always fetch odds for 1X2 display
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1, // Retry once on failure
  });

  const handleAddSelection = (
    marketKey: string,
    selectionKey: string,
    odds: number
  ) => {
    // Prevent betting on finished fixtures
    if (fixture.isFinished) {
      toast.error("Bu maç bitmiş, bahis yapılamaz");
      return;
    }

    // Prevent betting on started fixtures (only pre-match betting allowed)
    if (fixture.isStarted && !fixture.isLive) {
      toast.error("Maç başlamış, bahis yapılamaz");
      return;
    }

    // Check if user is authenticated
    if (!user) {
      toast.error("Kupon oluşturmak için giriş yapmalısınız");
      router.push("/login");
      return;
    }

    const kickoffAtStr = typeof fixture.kickoffAt === "string" 
      ? fixture.kickoffAt 
      : fixture.kickoffAt.toISOString();

    const selection: BetslipSelection = {
      fixtureId: fixture.fixtureId,
      marketKey,
      selectionKey,
      odds,
      homeTeam: fixture.teams.home,
      awayTeam: fixture.teams.away,
      kickoffAt: kickoffAtStr,
      marketLabel: getMarketLabel(marketKey),
      selectionLabel: getSelectionLabel(selectionKey, marketKey),
    };

    onAddSelection(selection);
    toast.success("Seçim kupona eklendi");
  };

  // Debug: Log odds data
  if (oddsData) {
    console.log("[FixturesList] Odds data for fixture", fixture.fixtureId, ":", {
      marketsCount: oddsData.markets?.length || 0,
      markets: oddsData.markets?.slice(0, 5), // First 5 markets for debugging
    });
  }

  // Get 1X2 odds from fixture data if available, otherwise from fetched odds
  const odds1X2 = oddsData ? get1X2Odds(oddsData.markets) : undefined;
  const oddsOU = oddsData ? getOUOdds(oddsData.markets) : undefined;
  const oddsBTTS = oddsData ? getBTTSOdds(oddsData.markets) : undefined;

  // Debug: Log extracted odds
  if (oddsData) {
    console.log("[FixturesList] Extracted odds:", {
      "1X2": odds1X2,
      OU: oddsOU,
      BTTS: oddsBTTS,
    });
  }

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on odds buttons or expand button
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("[data-odds-button]") ||
      target.closest("[data-expand-button]")
    ) {
      return;
    }
    router.push(`/fixtures/${fixture.fixtureId}`);
  };

  // Only disable betting for fixtures that have actually started (LIVE, HT, etc.) but are not live
  // Allow pre-match betting for all upcoming fixtures (NS state or not started yet)
  // isStarted includes LIVE, HT, FT, etc. - we only want to disable if it's started but not live
  const isDisabled = fixture.isStarted && !fixture.isLive;
  
  // For finished fixtures, always disable betting
  const isFinished = fixture.isFinished || false;

  return (
    <div 
      className={cn(
        "border-b border-dark-border p-3 transition-colors",
        (isDisabled || isFinished)
          ? "opacity-75 cursor-pointer" 
          : "hover:bg-dark-hover cursor-pointer"
      )}
      onClick={handleRowClick}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Meta & Teams */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs ${cn(isExpanded ? "text-text-primary" : "text-text-secondary")}`}>
              {formatKickoffTime(fixture.kickoffAt)}
            </span>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {/* Home Team */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {fixture.homeTeamLogo && (
                  <img
                    src={fixture.homeTeamLogo}
                    alt={fixture.teams.home}
                    className="w-6 h-6 object-contain flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <span className={`truncate ${cn(isExpanded ? "text-text-primary font-medium" : "text-text-secondary")}`}>
                  {fixture.teams.home}
                </span>
              </div>
            </div>
            {/* Away Team */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {fixture.awayTeamLogo && (
                  <img
                    src={fixture.awayTeamLogo}
                    alt={fixture.teams.away}
                    className="w-6 h-6 object-contain flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <span className={`truncate ${cn(isExpanded ? "text-text-primary font-medium" : "text-text-secondary")}`}>
                  {fixture.teams.away}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 1X2 Odds Grid - Show score for finished fixtures, odds for active fixtures */}
        {isFinished ? (
          <div className="flex items-center justify-center w-full md:w-[280px] shrink-0">
            {fixture.score ? (
              <div className="flex items-center gap-2 text-text-primary">
                <span className="text-lg font-bold">{fixture.score.home}</span>
                <span className="text-text-muted">-</span>
                <span className="text-lg font-bold">{fixture.score.away}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-text-primary">
                <span className="text-lg font-bold">0</span>
                <span className="text-text-muted">-</span>
                <span className="text-lg font-bold">0</span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 w-full md:w-[280px] shrink-0" onClick={(e) => e.stopPropagation()}>
            {odds1X2?.home && (
              <OddsButton
                label="1"
                odds={odds1X2.home}
                onClick={() => handleAddSelection("1X2", "1", odds1X2.home!)}
                disabled={isDisabled || isFinished}
              />
            )}
            {odds1X2?.draw && (
              <OddsButton
                label="X"
                odds={odds1X2.draw}
                onClick={() => handleAddSelection("1X2", "X", odds1X2.draw!)}
                disabled={isDisabled || isFinished}
              />
            )}
            {odds1X2?.away && (
              <OddsButton
                label="2"
                odds={odds1X2.away}
                onClick={() => handleAddSelection("1X2", "2", odds1X2.away!)}
                disabled={isDisabled || isFinished}
              />
            )}
            {!odds1X2 && !isLoadingOdds && !isErrorOdds && (
              <>
                <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                  <span className="text-[10px] opacity-50">-</span>
                </div>
                <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                  <span className="text-[10px] opacity-50">-</span>
                </div>
                <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                  <span className="text-[10px] opacity-50">-</span>
                </div>
              </>
            )}
            {isErrorOdds && (
              <>
                <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-red-500 text-xs" title={oddsError?.message}>
                  <span className="text-[10px]">!</span>
                </div>
                <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-red-500 text-xs" title={oddsError?.message}>
                  <span className="text-[10px]">!</span>
                </div>
                <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-red-500 text-xs" title={oddsError?.message}>
                  <span className="text-[10px]">!</span>
                </div>
              </>
            )}
            {isLoadingOdds && (
              <>
                <Skeleton className="h-12 w-full" variant="rectangular" />
                <Skeleton className="h-12 w-full" variant="rectangular" />
                <Skeleton className="h-12 w-full" variant="rectangular" />
              </>
            )}
          </div>
        )}

        {/* Expand Button - Hide for finished fixtures */}
        {!isFinished && (
          <div className="hidden md:flex items-center justify-center w-8">
          <button
            data-expand-button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={cn(
              "text-xs text-text-muted hover:text-text-primary transition-colors",
              isExpanded ? "text-text-primary" : undefined
            )}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "−" : "+"}
          </button>
          </div>
        )}
      </div>

      {/* Expanded Content - OU2.5 and BTTS - Hide for finished fixtures */}
      {isExpanded && !isFinished && (
        <div className="mt-4 pt-4 border-t border-dark-border" onClick={(e) => e.stopPropagation()}>
          {isLoadingOdds ? (
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 w-full" variant="rectangular" />
              <Skeleton className="h-10 w-full" variant="rectangular" />
            </div>
          ) : isErrorOdds ? (
            <div className="text-text-muted text-sm">
              <div>Odds yüklenirken hata oluştu</div>
              {oddsError && (
                <div className="text-xs mt-1 opacity-75">
                  {oddsError.message || "Bilinmeyen hata"}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {/* Over/Under (prefers 2.5 if available) */}
              <div>
                <div className="text-xs text-text-muted mb-1">Over/Under</div>
                <div className="grid grid-cols-2 gap-1">
                  {oddsOU?.over && oddsOU.marketKey && (
                    <OddsButton
                      label="Over"
                      odds={oddsOU.over}
                      onClick={() => handleAddSelection(oddsOU.marketKey!, "Over", oddsOU.over!)}
                      disabled={isDisabled || isFinished}
                    />
                  )}
                  {oddsOU?.under && oddsOU.marketKey && (
                    <OddsButton
                      label="Under"
                      odds={oddsOU.under}
                      onClick={() => handleAddSelection(oddsOU.marketKey!, "Under", oddsOU.under!)}
                      disabled={isDisabled || isFinished}
                    />
                  )}
                  {!oddsOU && (
                    <>
                      <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                        <span className="text-[10px] opacity-50">-</span>
                      </div>
                      <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                        <span className="text-[10px] opacity-50">-</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* BTTS */}
              <div>
                <div className="text-xs text-text-muted mb-1">Both Teams to Score</div>
                <div className="grid grid-cols-2 gap-1">
                  {oddsBTTS?.yes && (
                    <OddsButton
                      label="Yes"
                      odds={oddsBTTS.yes}
                      onClick={() => handleAddSelection("BTTS", "Yes", oddsBTTS.yes!)}
                      disabled={isDisabled || isFinished}
                    />
                  )}
                  {oddsBTTS?.no && (
                    <OddsButton
                      label="No"
                      odds={oddsBTTS.no}
                      onClick={() => handleAddSelection("BTTS", "No", oddsBTTS.no!)}
                      disabled={isDisabled || isFinished}
                    />
                  )}
                  {!oddsBTTS && (
                    <>
                      <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                        <span className="text-[10px] opacity-50">-</span>
                      </div>
                      <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-text-muted text-sm">
                        <span className="text-[10px] opacity-50">-</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface OddsButtonProps {
  label: string;
  odds: number;
  onClick: () => void;
  disabled?: boolean;
}

function OddsButton({ label, odds, onClick, disabled = false }: OddsButtonProps) {
  return (
    <button
      data-odds-button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface transition-colors text-text-primary",
        disabled 
          ? "opacity-50 cursor-not-allowed" 
          : "hover:bg-dark-hover cursor-pointer"
      )}
    >
      <span className="text-[10px] font-medium opacity-80 text-text-secondary">{label}</span>
      <span className="text-sm font-bold text-[#ffdf1b]">{odds.toFixed(2)}</span>
    </button>
  );
}

export function FixturesList({ leagueId, date }: FixturesListProps) {
  const addSelection = useBetslipStore((state) => state.addSelection);
  const [expandedFixtures, setExpandedFixtures] = useState<Set<string | number>>(
    new Set()
  );

  const {
    data: fixtures = [],
    isLoading,
    isError,
    error,
  } = useQuery<FixtureDTO[], Error>({
    queryKey: ["fixtures", leagueId, date],
    queryFn: () => {
      return fetchFixtures(leagueId || undefined, date);
    },
    enabled: true, // Always enabled, even without leagueId
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (count, err) => (err as Error & { status?: number })?.status !== 400 && count < 2,
  });

  const toggleFixture = (fixtureId: string | number) => {
    setExpandedFixtures((prev) => {
      const next = new Set(prev);
      if (next.has(fixtureId)) {
        next.delete(fixtureId);
      } else {
        next.add(fixtureId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-dark-border p-3">
            <Skeleton className="h-16 w-full" variant="rectangular" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-text-muted text-sm">
          Fixtures yüklenirken hata oluştu: {error?.message || "Unknown error"}
        </p>
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-text-muted text-sm">
          {leagueId ? "Bu lig için maç bulunamadı" : "Önümüzdeki 3 gün için maç bulunamadı"}
        </p>
      </div>
    );
  }

  // Separate fixtures into active (upcoming/pre-match) and finished (past matches)
  // Also filter by kickoff time to ensure we don't show past matches as upcoming
  const now = new Date();
  const activeFixtures = fixtures.filter((f) => {
    if (f.isFinished) return false;
    
    // Double-check: if kickoff time is in the past (more than 2 hours ago), consider it finished
    try {
      const kickoffTime = typeof f.kickoffAt === "string" ? new Date(f.kickoffAt) : f.kickoffAt;
      const matchEndTime = new Date(kickoffTime.getTime() + (90 + 30) * 60 * 1000); // 90 min + 30 min extra time
      
      // If match end time is more than 1 hour in the past, consider it finished
      if (now.getTime() > matchEndTime.getTime() + 60 * 60 * 1000) {
        return false;
      }
    } catch {
      // If date parsing fails, trust the isFinished flag
    }
    
    return true;
  });
  
  const finishedFixtures = fixtures.filter((f) => {
    if (f.isFinished) return true;
    
    // Double-check: if kickoff time is in the past (more than 2 hours ago), consider it finished
    try {
      const kickoffTime = typeof f.kickoffAt === "string" ? new Date(f.kickoffAt) : f.kickoffAt;
      const matchEndTime = new Date(kickoffTime.getTime() + (90 + 30) * 60 * 1000); // 90 min + 30 min extra time
      
      // If match end time is more than 1 hour in the past, consider it finished
      if (now.getTime() > matchEndTime.getTime() + 60 * 60 * 1000) {
        return true;
      }
    } catch {
      // If date parsing fails, trust the isFinished flag
    }
    
    return false;
  });

  return (
    <div className="space-y-6">
      {/* Upcoming Matches Section */}
      {activeFixtures.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-text-primary">Upcoming Matches</h2>
          <div className="space-y-2">
            {activeFixtures.map((fixture) => (
              <FixtureRow
                key={fixture.fixtureId}
                fixture={fixture}
                isExpanded={expandedFixtures.has(fixture.fixtureId)}
                onToggle={() => toggleFixture(fixture.fixtureId)}
                onAddSelection={addSelection}
              />
            ))}
          </div>
        </div>
      )}

      {/* Latest Matches Section */}
      {finishedFixtures.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-text-primary">Latest Matches</h2>
          <div className="space-y-2">
            {finishedFixtures.map((fixture) => (
              <FixtureRow
                key={fixture.fixtureId}
                fixture={fixture}
                isExpanded={expandedFixtures.has(fixture.fixtureId)}
                onToggle={() => toggleFixture(fixture.fixtureId)}
                onAddSelection={addSelection}
              />
            ))}
          </div>
        </div>
      )}

      {/* No fixtures message */}
      {activeFixtures.length === 0 && finishedFixtures.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-text-muted text-sm">
            {leagueId ? "Bu lig için maç bulunamadı" : "Önümüzdeki 3 gün için maç bulunamadı"}
          </p>
        </div>
      )}
    </div>
  );
}
