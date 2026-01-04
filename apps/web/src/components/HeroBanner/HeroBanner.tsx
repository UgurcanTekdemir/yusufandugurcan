"use client";

import Link from "next/link";
import { Flame, Tv } from "lucide-react";

export function HeroBanner() {
  return (
    <div className="relative h-[280px] w-full shrink-0 overflow-hidden mb-6 rounded-2xl group">
      <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0f] via-[#0b0b0f]/60 to-transparent z-10"></div>
      <div
        className="w-full h-full bg-gradient-to-br from-[#0b0b0f] via-[#15151a] to-[#0b0b0f] opacity-60 group-hover:opacity-80 transition-opacity duration-1000"
        style={{
          backgroundImage: "radial-gradient(circle at 30% 50%, rgba(0,255,163,0.1) 0%, transparent 50%)",
        }}
      />
      <div className="absolute top-0 left-0 bottom-0 z-20 flex flex-col justify-center px-10 max-w-2xl">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
            Canlı Yayın
          </span>
          <span className="flex items-center gap-1 text-[#00ffa3] text-xs font-bold uppercase tracking-wide">
            <Flame size={12} /> Günün Maçı
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-2">
          PREMIER LEAGUE <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500 font-light">
            VS
          </span>{" "}
          HIGHLIGHTS
        </h1>
        <p className="text-gray-400 text-sm mb-6 max-w-md">
          Yarı final heyecanı. Haaland gol atar bahsine yükseltilmiş oranlar. Bu maçı kaçırma!
        </p>
        <div className="flex gap-3">
          <Link
            href="/live"
            className="px-6 py-3 bg-gradient-to-r from-[#00ffa3] to-[#00ce84] text-black font-bold rounded-lg hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all transform hover:-translate-y-0.5"
          >
            Bahis Yap
          </Link>
          <button className="px-6 py-3 bg-white/10 backdrop-blur-sm border border-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-all flex items-center gap-2">
            <Tv size={16} /> Canlı İzle
          </button>
        </div>
      </div>
    </div>
  );
}

