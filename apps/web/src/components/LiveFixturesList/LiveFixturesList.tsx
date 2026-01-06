"use client";

import { useState, memo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LiveFixtureDTO, OddsDTO, MarketOdds } from "@repo/shared/types";
import { Skeleton } from "../ui/Skeleton";
import { useBetslipStore, type BetslipSelection } from "@/stores/betslipStore";
import { getMarketLabel, getSelectionLabel } from "@/stores/betslipUtils";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/auth/useAuth";

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Fetch live fixtures
async function fetchLiveFixtures(): Promise<LiveFixtureDTO[]> {
  const response = await fetch("/api/sm/livescores");
  if (!response.ok) {
    throw new Error("Failed to fetch live fixtures");
  }
  return response.json();
}

// Fetch inplay odds for a fixture (default to Bet365 - bookmaker ID: 2)
async function fetchInplayOdds(fixtureId: string | number): Promise<OddsDTO> {
  const response = await fetch(`/api/sm/odds/inplay?fixtureId=${fixtureId}&filters=bookmakers:2`);
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
    
    throw new Error(`Failed to fetch inplay odds: ${errorMessage}`);
  }
  return response.json();
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
    const selection = market.selection.toLowerCase();
    if (selection === "1" || selection === "home") {
      odds.home = market.odds;
    } else if (selection === "x" || selection === "draw") {
      odds.draw = market.odds;
    } else if (selection === "2" || selection === "away") {
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
    const selection = preferred.selection.toLowerCase();
    odds.marketKey = preferred.market;
    if (selection === "over") odds.over = preferred.odds;
    if (selection === "under") odds.under = preferred.odds;
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
    const selection = market.selection.toLowerCase();
    if (selection === "yes") {
      odds.yes = market.odds;
    } else if (selection === "no") {
      odds.no = market.odds;
    }
  }

  return odds;
}

interface LiveFixtureRowProps {
  fixture: LiveFixtureDTO;
  isExpanded: boolean;
  onToggle: () => void;
  onAddSelection: (selection: BetslipSelection) => void;
}

const LiveFixtureRow = memo(function LiveFixtureRow({
  fixture,
  isExpanded,
  onToggle,
  onAddSelection,
}: LiveFixtureRowProps) {
  const { user } = useAuth();
  const router = useRouter();

  // Fetch inplay odds - always fetch for live matches (not just when expanded)
  // Poll every 5-7 seconds for real-time updates
  const {
    data: oddsData,
    isLoading: isLoadingOdds,
    isError: isErrorOdds,
  } = useQuery<OddsDTO, Error>({
    queryKey: ["odds", "inplay", fixture.fixtureId],
    queryFn: () => fetchInplayOdds(fixture.fixtureId),
    enabled: true, // Always fetch for live matches
    refetchInterval: 6 * 1000, // Poll every 6 seconds (recommended: 5-8 seconds)
    refetchIntervalInBackground: true,
    staleTime: 0, // Always consider stale to ensure fresh data
    cacheTime: 30 * 1000, // Keep in cache for 30 seconds
  });

  const handleAddSelection = (
    marketKey: string,
    selectionKey: string,
    odds: number
  ) => {
    // Check if user is authenticated
    if (!user) {
      toast.error("Kupon oluşturmak için giriş yapmalısınız");
      router.push("/login");
      return;
    }

    const kickoffAtStr = new Date().toISOString();

    const selection: BetslipSelection = {
      fixtureId: fixture.fixtureId,
      marketKey,
      selectionKey,
      odds,
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      kickoffAt: kickoffAtStr,
      marketLabel: getMarketLabel(marketKey),
      selectionLabel: getSelectionLabel(selectionKey, marketKey),
    };

    onAddSelection(selection);
    toast.success("Seçim kupona eklendi");
  };

  // Get odds
  const odds1X2 = oddsData ? get1X2Odds(oddsData.markets) : undefined;
  const oddsOU = oddsData ? getOUOdds(oddsData.markets) : undefined;
  const oddsBTTS = oddsData ? getBTTSOdds(oddsData.markets) : undefined;

  // Format score
  const score = fixture.score
    ? `${fixture.score.home} - ${fixture.score.away}`
    : null;

  // Client-side timer for seconds (updates every second for real-time display)
  // Use period info if available (preferred), otherwise fallback to minute
  const [currentSecond, setCurrentSecond] = useState(0);
  const [lastMinute, setLastMinute] = useState<number | null>(null);
  const [hasTimer, setHasTimer] = useState<boolean>(false);
  const [countsFrom, setCountsFrom] = useState<number>(0);
  const [periodLength, setPeriodLength] = useState<number>(45);
  const [timeAdded, setTimeAdded] = useState<number | null>(null);

  // Calculate time display from period info or fallback
  useEffect(() => {
    // Priority 1: Use period info if available (ticking=true)
    if (fixture.currentPeriod) {
      const period = fixture.currentPeriod;
      const periodMinutes = period.minutes ?? 0;
      const periodSeconds = period.seconds ?? 0;
      const periodCountsFrom = period.counts_from ?? 0;
      const periodPeriodLength = period.period_length ?? 45;
      
      // Total minute = counts_from + minutes
      const totalMinute = periodCountsFrom + periodMinutes;
      
      setLastMinute(totalMinute);
      setCurrentSecond(periodSeconds);
      setHasTimer(period.has_timer ?? false);
      setCountsFrom(periodCountsFrom);
      setPeriodLength(periodPeriodLength);
      setTimeAdded(period.time_added ?? null);
    } else if (fixture.minute !== undefined && fixture.minute !== null) {
      // Priority 2: Use minute from API
      setLastMinute(fixture.minute);
      setCurrentSecond(0);
      setHasTimer(false);
    } else if (fixture.startingAt) {
      // Priority 3: Calculate from starting_at
      try {
        const startTime = new Date(fixture.startingAt);
        const now = new Date();
        const elapsedMs = now.getTime() - startTime.getTime();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const calculatedMinute = Math.floor(elapsedSeconds / 60);
        const calculatedSecond = elapsedSeconds % 60;
        
        if (calculatedMinute >= 0 && calculatedMinute < 120) {
          setLastMinute(calculatedMinute);
          setCurrentSecond(calculatedSecond);
          setHasTimer(true); // Assume timer available for calculated time
        } else {
          setLastMinute(null);
          setCurrentSecond(0);
          setHasTimer(false);
        }
      } catch {
        setLastMinute(null);
        setCurrentSecond(0);
        setHasTimer(false);
      }
    } else {
      setLastMinute(null);
      setCurrentSecond(0);
      setHasTimer(false);
    }
  }, [fixture.currentPeriod, fixture.minute, fixture.startingAt]);

  // Timer that updates every second (only if has_timer=true)
  useEffect(() => {
    // Only run timer if we have a minute value and has_timer is true
    if (lastMinute === null || !hasTimer) return;

    // Update seconds every second
    const interval = setInterval(() => {
      setCurrentSecond((prev) => {
        const newSecond = prev + 1;
        // If seconds reach 60, increment minute (client-side estimation)
        if (newSecond >= 60) {
          setLastMinute((m) => (m !== null ? m + 1 : null));
          return 0;
        }
        return newSecond;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lastMinute, hasTimer]);

  // Format time display based on period rules
  // If has_timer=true: MM:SS format (e.g., 23:07)
  // If has_timer=false: MM' format (e.g., 23')
  // If in added time: show as 45+2 or 45+2:13
  let timeDisplay: string | null = null;
  
  if (lastMinute !== null) {
    const base = countsFrom + periodLength; // e.g., 45 or 90
    const totalMin = lastMinute;
    
    // Check if we're in added time
    // Use time_added from period if available, otherwise check if totalMin > base
    const addedTime = timeAdded ?? (totalMin > base ? totalMin - base : null);
    
    if (addedTime !== null && addedTime > 0) {
      // Added time: show as 45+2 or 45+2:13
      // Cap added time to reasonable value (max 15 minutes)
      const cappedAddedTime = Math.min(addedTime, 15);
      
      if (hasTimer && currentSecond !== null && currentSecond !== undefined) {
        timeDisplay = `${base}+${cappedAddedTime}:${currentSecond.toString().padStart(2, '0')}`;
      } else {
        timeDisplay = `${base}+${cappedAddedTime}'`;
      }
    } else {
      // Normal time
      if (hasTimer && currentSecond !== null && currentSecond !== undefined) {
        timeDisplay = `${totalMin}:${currentSecond.toString().padStart(2, '0')}`;
      } else {
        timeDisplay = `${totalMin}'`;
      }
    }
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

  return (
    <div 
      className={`border-b border-dark-border p-3 hover:bg-dark-hover transition-colors cursor-pointer`}
      onClick={handleRowClick}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* Meta & Teams */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase animate-pulse">
              Live
            </span>
            {timeDisplay ? (
              <span className="text-text-primary font-semibold text-sm font-mono">
                {timeDisplay}
              </span>
            ) : (
              <span className="text-text-muted text-xs">LIVE</span>
            )}
          </div>
          <div className="flex flex-col gap-2 mt-1">
            {/* Home Team */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {fixture.homeTeamLogo && (
                  <img
                    src={fixture.homeTeamLogo}
                    alt={fixture.homeTeam}
                    className="w-8 h-8 object-contain flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <span className="text-text-primary font-medium truncate">{fixture.homeTeam}</span>
              </div>
              {score && (
                <span className="text-accent-primary font-bold text-lg flex-shrink-0">
                  {fixture.score?.home}
                </span>
              )}
            </div>
            {/* Away Team */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {fixture.awayTeamLogo && (
                  <img
                    src={fixture.awayTeamLogo}
                    alt={fixture.awayTeam}
                    className="w-8 h-8 object-contain flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <span className="text-text-primary font-medium truncate">{fixture.awayTeam}</span>
              </div>
              {score && (
                <span className="text-accent-primary font-bold text-lg flex-shrink-0">
                  {fixture.score?.away}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 1X2 Odds Grid */}
        <div className="grid grid-cols-3 gap-1 w-full md:w-[280px] shrink-0">
          {odds1X2?.home && (
            <OddsButton
              label="1"
              odds={odds1X2.home}
              onClick={() => handleAddSelection("1X2", "1", odds1X2.home!)}
            />
          )}
          {odds1X2?.draw && (
            <OddsButton
              label="X"
              odds={odds1X2.draw}
              onClick={() => handleAddSelection("1X2", "X", odds1X2.draw!)}
            />
          )}
          {odds1X2?.away && (
            <OddsButton
              label="2"
              odds={odds1X2.away}
              onClick={() => handleAddSelection("1X2", "2", odds1X2.away!)}
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
              <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-red-500 text-xs" title="Odds yüklenirken hata oluştu">
                <span className="text-[10px]">!</span>
              </div>
              <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-red-500 text-xs" title="Odds yüklenirken hata oluştu">
                <span className="text-[10px]">!</span>
              </div>
              <div className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface text-red-500 text-xs" title="Odds yüklenirken hata oluştu">
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

        {/* Expand Button */}
        <div className="hidden md:flex items-center justify-center w-8">
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent row click navigation
              onToggle();
            }}
            data-expand-button
            className={cn(
              "text-xs text-text-muted hover:text-text-primary transition-colors",
              isExpanded ? "text-text-primary" : undefined
            )}
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "−" : "+"}
          </button>
        </div>
      </div>

      {/* Expanded Content - OU2.5 and BTTS */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-dark-border">
          {isLoadingOdds ? (
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 w-full" variant="rectangular" />
              <Skeleton className="h-10 w-full" variant="rectangular" />
            </div>
          ) : isErrorOdds ? (
            <div className="text-text-muted text-sm">
              Odds yüklenirken hata oluştu
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
                    />
                  )}
                  {oddsOU?.under && oddsOU.marketKey && (
                    <OddsButton
                      label="Under"
                      odds={oddsOU.under}
                      onClick={() => handleAddSelection(oddsOU.marketKey!, "Under", oddsOU.under!)}
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
                    />
                  )}
                  {oddsBTTS?.no && (
                    <OddsButton
                      label="No"
                      odds={oddsBTTS.no}
                      onClick={() => handleAddSelection("BTTS", "No", oddsBTTS.no!)}
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
});

interface OddsButtonProps {
  label: string;
  odds: number;
  onClick: () => void;
}

function OddsButton({ label, odds, onClick }: OddsButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click navigation
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      data-odds-button
      className="flex flex-col items-center justify-center py-2 px-1 rounded bg-dark-surface hover:bg-dark-hover transition-colors text-text-primary"
    >
      <span className="text-[10px] font-medium opacity-80 text-text-secondary">{label}</span>
      <span className="text-sm font-bold text-[#ffdf1b]">{odds.toFixed(2)}</span>
    </button>
  );
}

export function LiveFixturesList() {
  const addSelection = useBetslipStore((state) => state.addSelection);
  const [expandedFixtures, setExpandedFixtures] = useState<Set<string | number>>(
    new Set()
  );

  // Fetch live fixtures with frequent polling for real-time updates
  const {
    data: fixtures = [],
    isLoading,
    isError,
    error,
  } = useQuery<LiveFixtureDTO[], Error>({
    queryKey: ["livescores"],
    queryFn: fetchLiveFixtures,
    refetchInterval: 2 * 1000, // Poll every 2 seconds for real-time minute updates
    refetchIntervalInBackground: true,
    staleTime: 0, // Always consider stale to ensure fresh data
    cacheTime: 10 * 1000, // Keep in cache for 10 seconds
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
          Live fixtures yüklenirken hata oluştu: {error?.message || "Unknown error"}
        </p>
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-text-muted text-sm">Şu anda canlı maç yok</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fixtures.map((fixture) => (
        <LiveFixtureRow
          key={fixture.fixtureId}
          fixture={fixture}
          isExpanded={expandedFixtures.has(fixture.fixtureId)}
          onToggle={() => toggleFixture(fixture.fixtureId)}
          onAddSelection={addSelection}
        />
      ))}
    </div>
  );
}
