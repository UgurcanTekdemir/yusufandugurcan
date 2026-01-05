"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronRight, Star, Menu } from "lucide-react";
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
  const response = await fetch("/api/sm/sidebar/countries");
  if (!response.ok) {
    throw new Error("Failed to fetch countries");
  }
  return response.json();
}

// Fetch leagues for a country
async function fetchLeagues(countryId: string | number): Promise<LeagueDTO[]> {
  const response = await fetch(`/api/sm/sidebar/leagues?countryId=${countryId}`);
  if (!response.ok) {
    const error = new Error("Failed to fetch leagues") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export function LeftSidebar({ isOpen: externalIsOpen, onClose }: LeftSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLeagueId = searchParams.get("leagueId");

  // Internal state for sidebar open/close (desktop)
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden lg:block fixed left-0 top-[70px] h-[calc(100vh-70px)] bg-dark-sidebar transition-all duration-500 ease-in-out z-40",
          sidebarOpen ? "w-[250px]" : "w-[78px]"
        )}
      >
        {/* Logo Section */}
        <div className="h-[60px] flex items-center relative px-3 border-b border-dark-border">
          <div
            className={cn(
              "flex items-center gap-3 transition-opacity duration-500",
              sidebarOpen ? "opacity-100" : "opacity-0"
            )}
          >
            <Star size={20} className="text-bet365-green flex-shrink-0" />
            <span className="text-white text-lg font-semibold whitespace-nowrap">Sports</span>
          </div>
          <button
            onClick={toggleSidebar}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-dark-border">
          <div className="relative">
            <Search
              size={18}
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none",
                sidebarOpen ? "opacity-100" : "opacity-0"
              )}
            />
            <input
              type="text"
              placeholder={sidebarOpen ? "Search..." : ""}
              className={cn(
                "w-full bg-dark-bg text-white text-sm outline-none rounded-lg transition-all duration-500",
                sidebarOpen
                  ? "px-10 py-2.5 pl-10"
                  : "px-3 py-2.5 w-[50px]"
              )}
              onClick={() => !sidebarOpen && setSidebarOpen(true)}
            />
            {!sidebarOpen && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <Search size={18} className="text-text-muted" />
              </div>
            )}
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar mt-2">
          {isLoadingCountries ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className={cn("h-6", sidebarOpen ? "w-32" : "w-8")} />
                  {sidebarOpen && (
                    <div className="ml-4 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : isErrorCountries ? (
            <div className="p-4">
              <p className="text-text-secondary text-sm">
                {countriesError?.message || "Bilinmeyen hata"}
              </p>
            </div>
          ) : (
            <div className="px-2">
              {countries.map((country) => (
                <CountrySection
                  key={country.countryId}
                  country={country}
                  isExpanded={expandedCountries.has(country.countryId)}
                  onToggle={() => toggleCountry(country.countryId)}
                  selectedLeagueId={selectedLeagueId}
                  onLeagueSelect={handleLeagueSelect}
                  sidebarOpen={sidebarOpen}
                />
              ))}
            </div>
          )}
        </nav>
      </div>

      {/* Spacer for desktop sidebar */}
      <div
        className={cn(
          "hidden lg:block transition-all duration-500 ease-in-out",
          sidebarOpen ? "w-[250px]" : "w-[78px]"
        )}
      />

      {/* Mobile Drawer */}
      {externalIsOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-dark-sidebar border-r border-dark-border shadow-2xl">
            <div className="p-4 border-b border-dark-border flex justify-between items-center">
              <h2 className="text-text-primary font-semibold text-lg">Sports</h2>
              <button
                onClick={onClose}
                className="text-text-secondary hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-3 border-b border-dark-border">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-dark-bg text-white text-sm outline-none rounded-lg px-10 py-2.5"
                />
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-2 custom-scrollbar">
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
                  <p className="text-text-secondary text-sm">
                    {countriesError?.message || "Bilinmeyen hata"}
                  </p>
                </div>
              ) : (
                countries.map((country) => (
                  <CountrySection
                    key={country.countryId}
                    country={country}
                    isExpanded={expandedCountries.has(country.countryId)}
                    onToggle={() => toggleCountry(country.countryId)}
                    selectedLeagueId={selectedLeagueId}
                    onLeagueSelect={handleLeagueSelect}
                    sidebarOpen={true}
                  />
                ))
              )}
            </nav>
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
  sidebarOpen: boolean;
}

function CountrySection({
  country,
  isExpanded,
  onToggle,
  selectedLeagueId,
  onLeagueSelect,
  sidebarOpen,
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
    retry: (count, err) => (err as Error & { status?: number })?.status !== 400 && count < 2,
  });

  return (
    <div className="mb-1">
      {/* Country header */}
      <div className="relative group">
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all relative",
            isExpanded
              ? "bg-bet365-green text-white"
              : "text-text-secondary hover:bg-dark-hover hover:text-white"
          )}
        >
          <Star
            size={16}
            className={cn(
              "flex-shrink-0",
              isExpanded ? "fill-white text-white" : "text-text-muted"
            )}
          />
          <span
            className={cn(
              "transition-opacity duration-500 whitespace-nowrap",
              sidebarOpen ? "opacity-100" : "opacity-0"
            )}
          >
            {country.name}
          </span>
          {sidebarOpen && isExpanded && (
            <ChevronRight size={14} className="ml-auto flex-shrink-0" />
          )}
        </button>

        {/* Tooltip for collapsed state */}
        {!sidebarOpen && (
          <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 z-50 bg-white text-dark-bg px-3 py-1.5 rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap text-sm">
            {country.name}
          </div>
        )}
      </div>

      {/* Leagues list */}
      {isExpanded && sidebarOpen && (
        <div className="ml-4 space-y-1 mt-1">
          {isLoadingLeagues ? (
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : isErrorLeagues ? (
            <div className="px-3 py-1.5">
              <p className="text-text-muted text-xs">
                {leaguesError?.message || "Ligler yüklenirken hata oluştu"}
              </p>
            </div>
          ) : leagues.length === 0 ? (
            <div className="px-3 py-1.5">
              <p className="text-text-muted text-xs">Lig bulunamadı</p>
            </div>
          ) : (
            leagues.map((league) => {
              const isSelected = selectedLeagueId === String(league.leagueId);
              return (
                <button
                  key={league.leagueId}
                  onClick={() => onLeagueSelect(league.leagueId)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors rounded-lg",
                    isSelected
                      ? "bg-bet365-green/20 text-bet365-green font-semibold"
                      : "text-text-secondary hover:bg-dark-hover hover:text-white"
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
