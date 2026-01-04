"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronRight, Star } from "lucide-react";
import type { CountryDTO, LeagueDTO } from "@repo/shared/types";
import { Skeleton } from "../ui/Skeleton";

interface LeftSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// Fetch countries
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

export function LeftSidebar({ isOpen = true, onClose }: LeftSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLeagueId = searchParams.get("leagueId");

  // Track expanded countries
  const [expandedCountries, setExpandedCountries] = useState<Set<string | number>>(
    new Set()
  );

  // Fetch countries
  const {
    data: countries = [],
    isLoading: isLoadingCountries,
    isError: isErrorCountries,
    error: countriesError,
  } = useQuery<CountryDTO[], Error>({
    queryKey: ["countries"],
    queryFn: fetchCountries,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Auto-expand country if a league is selected
  useEffect(() => {
    if (selectedLeagueId && countries.length > 0) {
      setExpandedCountries(new Set(countries.map((c) => c.countryId)));
    }
  }, [selectedLeagueId, countries]);

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

  const sidebarContent = (
    <div className={`hidden lg:flex w-[260px] flex-col bg-[#15151a] border-r border-white/10 overflow-hidden h-full`}>
      {/* Arama */}
      <div className="p-4 pb-2">
        <div className="relative group">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#00ffa3] transition-colors" />
          <input
            type="text"
            placeholder="Etkinlik ara..."
            className="w-full bg-[#0b0b0f] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-[#00ffa3]/50 transition-all placeholder:text-gray-600"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
        {isLoadingCountries ? (
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <div className="ml-4 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : isErrorCountries ? (
          <div className="p-4">
            <p className="text-gray-500 text-sm">
              Hata: {countriesError?.message || "Bilinmeyen hata"}
            </p>
          </div>
        ) : (
          <>
            {countries.map((country) => (
              <CountrySection
                key={country.countryId}
                country={country}
                isExpanded={expandedCountries.has(country.countryId)}
                onToggle={() => toggleCountry(country.countryId)}
                selectedLeagueId={selectedLeagueId}
                onLeagueSelect={handleLeagueSelect}
              />
            ))}
          </>
        )}
      </nav>
    </div>
  );

  return (
    <>
      {sidebarContent}

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-[#15151a] border-r border-white/10 shadow-2xl">
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-text-primary font-semibold text-lg">Sports</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
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
  // Fetch leagues for this country (only when expanded)
  const {
    data: leagues = [],
    isLoading: isLoadingLeagues,
    isError: isErrorLeagues,
    error: leaguesError,
  } = useQuery<LeagueDTO[], Error>({
    queryKey: ["leagues", country.countryId],
    queryFn: () => fetchLeagues(country.countryId),
    staleTime: 30 * 60 * 1000, // 30 minutes
    enabled: isExpanded, // Only fetch when country is expanded
  });

  return (
    <div className="mb-1">
      {/* Country header */}
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-lg text-xs font-medium transition-all group",
          isExpanded
            ? "bg-gradient-to-r from-[#00ffa3]/10 to-transparent text-[#00ffa3] border-l-2 border-[#00ffa3]"
            : "text-gray-400 hover:bg-white/5 hover:text-white"
        )}
      >
        <div className="flex items-center gap-3">
          <Star
            size={14}
            className={cn(
              isExpanded ? "fill-[#00ffa3] text-[#00ffa3]" : "text-gray-600"
            )}
          />
          <span>{country.name}</span>
        </div>
        {isExpanded && <ChevronRight size={14} />}
      </button>

      {/* Leagues list */}
      {isExpanded && (
        <div className="ml-4 space-y-1 mt-1">
          {isLoadingLeagues ? (
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : isErrorLeagues ? (
            <div className="px-3 py-1.5">
              <p className="text-gray-500 text-xs">
                {leaguesError?.message || "Ligler yüklenirken hata oluştu"}
              </p>
            </div>
          ) : leagues.length === 0 ? (
            <div className="px-3 py-1.5">
              <p className="text-gray-500 text-xs">Lig bulunamadı</p>
            </div>
          ) : (
            leagues.map((league) => {
              const isSelected = selectedLeagueId === String(league.leagueId);
              return (
                <button
                  key={league.leagueId}
                  onClick={() => onLeagueSelect(league.leagueId)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-lg text-xs transition-colors",
                    isSelected
                      ? "bg-[#00ffa3]/20 text-[#00ffa3] font-bold"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
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
