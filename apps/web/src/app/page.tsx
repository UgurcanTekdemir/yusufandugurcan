"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { TopLeaguesFixtures } from "@/components/TopLeaguesFixtures";
import { FootballSidebar } from "@/components/FootballSidebar";
import { useSearchParams } from "next/navigation";

export default function HomePage() {
  const searchParams = useSearchParams();
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Fixed Sidebar */}
      <FootballSidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 ml-[240px]">
      {/* Header */}
      <header className="h-[60px] bg-[#121212] border-b border-[#2a2a2a] flex items-center justify-between px-4 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent-primary rounded flex items-center justify-center font-bold text-white text-lg italic">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-white hidden sm:block">
              BET<span className="text-accent-primary">PRIME</span>
            </span>
          </Link>

          <div className="hidden md:flex ml-8 gap-6 text-sm font-medium text-gray-400">
            <Link href="/" className="text-white hover:text-accent-primary transition-colors">
              Sports
            </Link>
            <Link href="/live" className="hover:text-white transition-colors">
              In-Play
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 rounded bg-accent-primary text-white hover:bg-opacity-90 transition-colors text-sm font-medium"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Secondary Header / Filters */}
      <div className="sticky top-[60px] z-10 bg-dark-surface border-b border-dark-border p-2 flex items-center gap-2 overflow-x-auto">
        <Link
          href="/"
          className="px-4 py-1.5 rounded-full text-xs font-bold bg-accent-primary text-white hover:bg-opacity-90 transition-colors"
        >
          Overview
        </Link>
        <Link
          href="/live"
          className="px-4 py-1.5 rounded-full text-xs font-bold text-text-secondary hover:bg-dark-hover hover:text-white transition-colors"
        >
          Live Now
        </Link>
        <div className="flex-1"></div>
        <button className="text-text-secondary p-2 hover:text-text-primary transition-colors">
          <Calendar size={18} />
        </button>
      </div>

      {/* Featured Banner */}
      <div className="relative h-40 bg-gradient-to-r from-accent-primary/30 to-dark-bg flex items-center px-8 border-b border-accent-primary/20">
        <div className="z-10">
          <div className="text-accent-primary text-xs font-bold uppercase tracking-wider mb-1">
            Big Match
          </div>
          <h2 className="text-2xl text-text-primary font-bold">
            Premier League Highlights
          </h2>
          <p className="text-text-secondary text-sm mt-1">
            Latest odds and live updates available now!
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10">
          <svg
            width="140"
            height="140"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-text-primary"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </div>
      </div>

        {/* Fixtures List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <TopLeaguesFixtures date={date} />
          <div className="h-20"></div>
        </div>
      </div>
    </div>
  );
}
