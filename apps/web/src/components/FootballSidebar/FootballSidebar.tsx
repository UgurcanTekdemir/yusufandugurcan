"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import type { CountryDTO, LeagueDTO } from "@repo/shared/types";
import { Skeleton } from "../ui/Skeleton";

interface FootballSidebarProps {
  className?: string;
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Fetch countries (for football only)
async function fetchCountries(): Promise<CountryDTO[]> {
  const response = await fetch("/api/sm/countries");
  if (!response.ok) {
    throw new Error("Failed to fetch countries");
  }
  return response.json();
}

// Fetch leagues for a country
async function fetchLeagues(countryId: string | number): Promise<LeagueDTO[]> {
  const response = await fetch(`/api/sm/leagues?countryId=${countryId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch leagues");
  }
  return response.json();
}

export function FootballSidebar({ className }: FootballSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLeagueId = searchParams.get("leagueId");

  const [expandedCountries, setExpandedCountries] = useState<Set<string | number>>(
    new Set()
  );

  // Fetch countries
  const {
    data: countries = [],
    isLoading: isLoadingCountries,
    isError: isErrorCountries,
  } = useQuery<CountryDTO[], Error>({
    queryKey: ["countries"],
    queryFn: fetchCountries,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const toggleCountry = (countryId: string | number) => {
    setExpandedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(countryId)) {
        next.delete(countryId);
      } else {
        next.add(countryId);
      }
      return next;
    });
  };

  const handleLeagueSelect = (leagueId: string | number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("leagueId", String(leagueId));
    
    const today = new Date().toISOString().split("T")[0];
    params.set("date", today);

    router.push(`?${params.toString()}`);
  };

  return (
    <aside className={cn("w-[240px] bg-[#1a1a1f] border-r border-white/10 flex flex-col h-screen fixed left-0 top-0", className)}>
      {/* Search */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-[#0f0f12] border border-white/10 rounded px-7 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00ffa3]/50"
          />
        </div>
      </div>

      {/* Scrollable content */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoadingCountries ? (
          <div className="p-3 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : isErrorCountries ? (
          <div className="p-3">
            <p className="text-gray-500 text-xs">Error loading countries</p>
          </div>
        ) : (
          <div className="py-2">
            {countries.slice(0, 20).map((country) => (
              <CountrySection
                key={country.countryId}
                country={country}
                isExpanded={expandedCountries.has(country.countryId)}
                onToggle={() => toggleCountry(country.countryId)}
                selectedLeagueId={selectedLeagueId}
                onLeagueSelect={handleLeagueSelect}
              />
            ))}
          </div>
        )}
      </nav>
    </aside>
  );
}

interface CountrySectionProps {
  country: CountryDTO;
  isExpanded: boolean;
  onToggle: () => void;
  selectedLeagueId: string | null;
  onLeagueSelect: (leagueId: string | number) => void;
}

function CountrySection({
  country,
  isExpanded,
  onToggle,
  selectedLeagueId,
  onLeagueSelect,
}: CountrySectionProps) {
  const {
    data: leagues = [],
    isLoading: isLoadingLeagues,
  } = useQuery<LeagueDTO[], Error>({
    queryKey: ["leagues", country.countryId],
    queryFn: () => fetchLeagues(country.countryId),
    staleTime: 30 * 60 * 1000,
    enabled: isExpanded,
  });

  return (
    <div className="mb-0.5">
      {/* Country header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors hover:bg-white/5",
          isExpanded ? "text-white bg-white/5" : "text-gray-400"
        )}
      >
        <span>{country.name}</span>
        <span className="text-gray-600">{isExpanded ? "−" : "+"}</span>
      </button>

      {/* Leagues list */}
      {isExpanded && (
        <div className="bg-[#15151a]">
          {isLoadingLeagues ? (
            <div className="px-3 py-1 space-y-1">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          ) : (
            leagues.map((league) => {
              const isSelected = selectedLeagueId === String(league.leagueId);
              return (
                <button
                  key={league.leagueId}
                  onClick={() => onLeagueSelect(league.leagueId)}
                  className={cn(
                    "w-full text-left px-6 py-2 text-xs transition-colors hover:bg-white/5",
                    isSelected
                      ? "text-[#00ffa3] font-semibold bg-[#00ffa3]/10"
                      : "text-gray-400"
                  )}
                >
                  {league.name}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

