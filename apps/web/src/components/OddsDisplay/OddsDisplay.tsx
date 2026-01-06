"use client";

import { useQuery } from "@tanstack/react-query";
import type { OddsDTO, MarketOdds } from "@repo/shared/types";
import { bet365LikeMarketDisplay, type MarketTemplate } from "@repo/shared/constants";
import { Skeleton } from "../ui/Skeleton";
import { useBetslipStore } from "@/stores/betslipStore";
import { useAuth } from "@/lib/auth/useAuth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface OddsDisplayProps {
  fixtureId: string | number;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string | Date;
}

async function fetchPrematchOdds(fixtureId: string | number): Promise<OddsDTO> {
  // Use Bet365 (bookmaker ID: 2) as default
  const response = await fetch(`/api/sm/odds/prematch?fixtureId=${fixtureId}&filters=bookmakers:2`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData?.error || `Failed to fetch odds: ${response.statusText}`);
  }
  return response.json();
}

// Group markets by their group property
function groupMarkets(markets: MarketOdds[]): Map<string, MarketOdds[]> {
  const grouped = new Map<string, MarketOdds[]>();
  
  for (const market of markets) {
    // Ensure all markets are assigned to a group (default: "Other")
    const group = market.group || "Other";
    if (!grouped.has(group)) {
      grouped.set(group, []);
    }
    grouped.get(group)!.push(market);
  }
  
  // Sort groups: prioritize known groups, then "Other" at the end
  const sortedGroups = new Map<string, MarketOdds[]>();
  const knownGroups = ["Match Result", "Goals", "Combos", "Handicap", "Halves", "Corners", "Cards", "Player Props"];
  
  for (const group of knownGroups) {
    if (grouped.has(group)) {
      sortedGroups.set(group, grouped.get(group)!);
    }
  }
  
  // Add remaining groups (including "Other")
  for (const [group, markets] of grouped.entries()) {
    if (!sortedGroups.has(group)) {
      sortedGroups.set(group, markets);
    }
  }
  
  return sortedGroups;
}

// Get unique market keys (marketId + market name combination)
function getUniqueMarketKeys(markets: MarketOdds[]): Array<{ marketId: number; market: string; label: string; group: string; template?: MarketTemplate; line?: number | string | null }> {
  const seen = new Set<string>();
  const unique: Array<{ marketId: number; market: string; label: string; group: string; template?: MarketTemplate; line?: number | string | null }> = [];
  
  for (const market of markets) {
    if (!market.marketId) continue; // Skip markets without marketId
    
    const key = `${market.marketId}-${market.market}`;
    if (!seen.has(key)) {
      seen.add(key);
      const config = bet365LikeMarketDisplay.find((c) => c.marketId === market.marketId);
      unique.push({
        marketId: market.marketId,
        market: market.market,
        label: market.label || config?.label || market.market,
        group: market.group || config?.group || "Other", // Always assign a group
        template: market.template || config?.template,
        line: market.line,
      });
    }
  }
  
  return unique;
}

// Render market based on template
function renderMarket(
  market: MarketOdds,
  allMarkets: MarketOdds[],
  onAddSelection: (marketKey: string, selectionKey: string, odds: number) => void
) {
  const config = bet365LikeMarketDisplay.find((c) => c.marketId === market.marketId);
  const template = market.template || config?.template || "list";

  // Get all selections for this specific market (same marketId and market key)
  const marketSelections = allMarkets.filter(
    (m) => m.marketId === market.marketId && m.market === market.market
  );

  switch (template) {
    case "1x2": {
      const home = marketSelections.find((s) => s.selection === "1" || s.selection === "Home");
      const draw = marketSelections.find((s) => s.selection === "X" || s.selection === "Draw");
      const away = marketSelections.find((s) => s.selection === "2" || s.selection === "Away");

      return (
        <div className="grid grid-cols-3 gap-2">
          {home && (
            <OddsButton
              label="1"
              odds={home.odds}
              onClick={() => onAddSelection(market.market, "1", home.odds)}
            />
          )}
          {draw && (
            <OddsButton
              label="X"
              odds={draw.odds}
              onClick={() => onAddSelection(market.market, "X", draw.odds)}
            />
          )}
          {away && (
            <OddsButton
              label="2"
              odds={away.odds}
              onClick={() => onAddSelection(market.market, "2", away.odds)}
            />
          )}
        </div>
      );
    }

    case "yesno": {
      const yes = marketSelections.find((s) => s.selection === "Yes" || s.selection.toLowerCase() === "yes");
      const no = marketSelections.find((s) => s.selection === "No" || s.selection.toLowerCase() === "no");

      return (
        <div className="grid grid-cols-2 gap-2">
          {yes && (
            <OddsButton
              label="Yes"
              odds={yes.odds}
              onClick={() => onAddSelection(market.market, "Yes", yes.odds)}
            />
          )}
          {no && (
            <OddsButton
              label="No"
              odds={no.odds}
              onClick={() => onAddSelection(market.market, "No", no.odds)}
            />
          )}
        </div>
      );
    }

    case "ou": {
      // Group by line value
      const byLine = new Map<string | number | null, { over?: MarketOdds; under?: MarketOdds }>();
      
      for (const sel of marketSelections) {
        const line = sel.line;
        if (!byLine.has(line)) {
          byLine.set(line, {});
        }
        const entry = byLine.get(line)!;
        if (sel.selection === "Over" || sel.selection.toLowerCase().includes("over")) {
          entry.over = sel;
        } else if (sel.selection === "Under" || sel.selection.toLowerCase().includes("under")) {
          entry.under = sel;
        }
      }

      return (
        <div className="space-y-2">
          {Array.from(byLine.entries()).map(([line, { over, under }]) => (
            <div key={String(line)} className="grid grid-cols-2 gap-2">
              {over && (
                <OddsButton
                  label={`Over ${line ?? ""}`}
                  odds={over.odds}
                  onClick={() => onAddSelection(market.market, `Over ${line}`, over.odds)}
                />
              )}
              {under && (
                <OddsButton
                  label={`Under ${line ?? ""}`}
                  odds={under.odds}
                  onClick={() => onAddSelection(market.market, `Under ${line}`, under.odds)}
                />
              )}
            </div>
          ))}
        </div>
      );
    }

    case "2way": {
      const home = marketSelections.find((s) => s.selection === "Home" || s.selection === "1");
      const away = marketSelections.find((s) => s.selection === "Away" || s.selection === "2");

      return (
        <div className="grid grid-cols-2 gap-2">
          {home && (
            <OddsButton
              label="Home"
              odds={home.odds}
              onClick={() => onAddSelection(market.market, "Home", home.odds)}
            />
          )}
          {away && (
            <OddsButton
              label="Away"
              odds={away.odds}
              onClick={() => onAddSelection(market.market, "Away", away.odds)}
            />
          )}
        </div>
      );
    }

    default: {
      // List all selections
      return (
        <div className="grid grid-cols-2 gap-2">
          {marketSelections.map((sel, idx) => (
            <OddsButton
              key={idx}
              label={sel.selection}
              odds={sel.odds}
              onClick={() => onAddSelection(market.market, sel.selection, sel.odds)}
            />
          ))}
        </div>
      );
    }
  }
}

interface OddsButtonProps {
  label: string;
  odds: number;
  onClick: () => void;
}

function OddsButton({ label, odds, onClick }: OddsButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center py-2 px-3 rounded bg-dark-surface hover:bg-dark-hover transition-colors text-text-primary border border-dark-border"
    >
      <span className="text-xs text-text-muted mb-1">{label}</span>
      <span className="text-sm font-bold text-[#ffdf1b]">{odds.toFixed(2)}</span>
    </button>
  );
}

export function OddsDisplay({ fixtureId, homeTeam, awayTeam, kickoffAt }: OddsDisplayProps) {
  const { user } = useAuth();
  const router = useRouter();
  const addSelection = useBetslipStore((state) => state.addSelection);

  const {
    data: oddsData,
    isLoading,
    isError,
    error,
  } = useQuery<OddsDTO, Error>({
    queryKey: ["odds", "prematch", fixtureId],
    queryFn: () => fetchPrematchOdds(fixtureId),
    enabled: !!fixtureId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });

  const handleAddSelection = (
    marketKey: string,
    selectionKey: string,
    odds: number
  ) => {
    if (!user) {
      toast.error("Kupon oluşturmak için giriş yapmalısınız");
      router.push("/login");
      return;
    }

    const kickoffAtStr = typeof kickoffAt === "string" ? kickoffAt : kickoffAt.toISOString();

    addSelection({
      fixtureId: String(fixtureId),
      marketKey,
      selectionKey,
      odds,
      homeTeam,
      awayTeam,
      kickoffAt: kickoffAtStr,
      marketLabel: marketKey,
      selectionLabel: selectionKey,
    });

    toast.success("Seçim kupona eklendi");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-red-400">
        <p className="font-semibold mb-2">Oranlar yüklenirken hata oluştu</p>
        <p className="text-sm text-text-muted">{error?.message || "Bilinmeyen hata"}</p>
      </div>
    );
  }

  if (!oddsData || !oddsData.markets || oddsData.markets.length === 0) {
    return (
      <div className="text-text-muted text-sm">
        Bu maç için oran bulunamadı.
      </div>
    );
  }

  // Group markets by their group
  const groupedMarkets = groupMarkets(oddsData.markets);
  
  // Get unique market keys
  const uniqueMarketKeys = getUniqueMarketKeys(oddsData.markets);
  
  // Debug: Log market statistics
  console.log("[OddsDisplay] Market statistics:", {
    totalMarkets: oddsData.markets.length,
    uniqueMarketKeys: uniqueMarketKeys.length,
    groups: Array.from(groupedMarkets.keys()),
    marketsByGroup: Array.from(groupedMarkets.entries()).map(([group, markets]) => ({
      group,
      count: markets.length,
      uniqueMarkets: getUniqueMarketKeys(markets).length,
    })),
  });

  return (
    <div className="space-y-6">
      {Array.from(groupedMarkets.entries()).map(([groupName, groupMarkets]) => {
        // Get unique markets in this group
        const uniqueInGroup = uniqueMarketKeys.filter(
          (m) => m.group === groupName
        );

        if (uniqueInGroup.length === 0) return null;

        return (
          <div key={groupName} className="bg-dark-surface rounded-lg p-4 border border-dark-border">
            <h3 className="text-lg font-semibold text-text-primary mb-4">{groupName}</h3>
            <div className="space-y-4">
              {uniqueInGroup.map((marketKey) => {
                // Find a representative market for rendering
                const representativeMarket = oddsData.markets.find(
                  (m) => m.marketId === marketKey.marketId && m.market === marketKey.market
                );

                if (!representativeMarket) return null;

                return (
                  <div key={`${marketKey.marketId}-${marketKey.market}`}>
                    <div className="text-sm text-text-muted mb-2">{marketKey.label}</div>
                    {renderMarket(representativeMarket, oddsData.markets, handleAddSelection)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

