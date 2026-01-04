"use client";

import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Activity } from "lucide-react";
import { FixturesList } from "@/components/FixturesList";
import { HeroBanner } from "@/components";

export default function FixturesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const leagueId = searchParams.get("leagueId");
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  return (
    <div className="flex flex-col h-full bg-[#0b0b0f] relative custom-scrollbar">
      {/* Hero Banner */}
      <div className="px-6 pt-6">
        <HeroBanner />
      </div>

      {/* Filtre Çubuğu */}
      <div className="flex items-center gap-2 px-6 mb-6 overflow-x-auto pb-2">
        <Link
          href="/live"
          className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg text-xs font-bold whitespace-nowrap border border-white/10 hover:bg-white/15 transition-all"
        >
          <Activity size={14} className="text-[#00ffa3]" /> Canlı Etkinlikler
        </Link>
        <button className="px-4 py-2 bg-transparent text-gray-400 hover:text-white rounded-lg text-xs font-bold whitespace-nowrap border border-white/5 hover:bg-white/5 transition-all">
          Yakında Başlıyor
        </button>
        <button className="px-4 py-2 bg-transparent text-gray-400 hover:text-white rounded-lg text-xs font-bold whitespace-nowrap border border-white/5 hover:bg-white/5 transition-all">
          Yüksek Oranlar
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] text-gray-500 uppercase font-bold">Sırala:</span>
          <select className="bg-[#15151a] border border-white/10 rounded-md text-xs text-white px-2 py-1 outline-none focus:border-[#00ffa3]/50 transition-all">
            <option>Popülerlik</option>
            <option>Zaman</option>
          </select>
        </div>
      </div>

      {/* Fixtures List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <div className="max-w-[1000px] mx-auto">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-[#00ffa3] rounded-full"></div>
            <h2 className="text-lg font-bold text-white tracking-tight">Öne Çıkan Maçlar</h2>
          </div>
          <FixturesList leagueId={leagueId || undefined} date={date} />
        </div>
        <div className="h-20"></div>
      </div>
    </div>
  );
}
