"use client";

import { useState } from "react";
import { Search, User, Menu, Trophy, Bell, DollarSign } from "lucide-react";
import Link from "next/link";
import { useBetslipStore } from "@/stores/betslipStore";
import { useAuth } from "@/lib/auth/useAuth";

interface HeaderBarProps {
  balance?: number;
  userName?: string;
  onLeftDrawerClick?: () => void;
  onRightDrawerClick?: () => void;
  selectionsCount?: number;
}

export function HeaderBar({
  balance: balanceProp,
  userName,
  onLeftDrawerClick,
  onRightDrawerClick,
  selectionsCount: selectionsCountProp,
}: HeaderBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();
  const selections = useBetslipStore((state) => state.selections);
  const selectionsCount = selectionsCountProp ?? selections.length;
  
  // Use prop balance or default
  const balance = balanceProp ?? 0;

  return (
    <header className="h-[70px] bg-[#15151a]/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-50 flex items-center justify-between px-6 shadow-2xl">
      <div className="flex items-center gap-6">
        <button
          onClick={onLeftDrawerClick}
          className="lg:hidden text-gray-400 hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-10 h-10 bg-gradient-to-r from-[#00ffa3] to-[#00ce84] rounded-lg flex items-center justify-center text-black font-black text-xl italic transform group-hover:skew-x-[-10deg] transition-transform">
            B
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-xl font-bold tracking-tighter text-white">
              BET<span className="text-[#00ffa3]">PRIME</span>
            </span>
            <span className="text-[10px] text-gray-400 uppercase tracking-[0.2em]">
              Yeni Nesil Bahis
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden xl:flex ml-10 items-center gap-1 bg-white/5 p-1 rounded-full border border-white/5">
          <Link
            href="/"
            className="px-5 py-2 rounded-full text-xs font-bold bg-white/10 text-white shadow-inner transition-all"
          >
            Spor
          </Link>
          <Link
            href="/live"
            className="px-5 py-2 rounded-full text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Canlı
          </Link>
          {user && (
            <Link
              href="/my/slips"
              className="px-5 py-2 rounded-full text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
            >
              Bahislerim
            </Link>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-5">
        {/* Balance (Desktop) */}
        {user && (
          <div className="hidden md:flex items-center gap-4 bg-[#0f0f13] px-4 py-2 rounded-xl border border-white/5 shadow-inner">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-gray-500 font-bold uppercase">Ana Cüzdan</span>
              <span className="text-[#00ffa3] font-mono font-bold text-sm tracking-wider">
                ₺{balance.toFixed(2)}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 p-[1px]">
              <div className="w-full h-full rounded-full bg-[#1a1a20] flex items-center justify-center text-gray-400">
                <DollarSign size={14} />
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
        </button>

        {/* Profile / Login */}
        {user ? (
          <div className="relative">
            <button className="w-10 h-10 rounded-full border-2 border-white/10 cursor-pointer hover:border-[#00ffa3] transition-colors bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
              <User size={18} className="text-gray-300" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#00ffa3] to-[#00ce84] text-black font-bold text-sm hover:shadow-[0_0_20px_rgba(0,255,163,0.3)] transition-all"
          >
            Giriş Yap
          </Link>
        )}

        {/* Mobile Bet Slip Trigger */}
        <button
          onClick={onRightDrawerClick}
          className="xl:hidden relative w-10 h-10 rounded-xl bg-[#2a2a35] flex items-center justify-center text-white border border-white/10 hover:border-[#00ffa3]/50 transition-colors"
          aria-label="Open betslip"
        >
          {selectionsCount > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#00ffa3] rounded-full flex items-center justify-center text-[10px] text-black font-bold">
              {selectionsCount}
            </div>
          )}
          <Trophy size={18} />
        </button>
      </div>
    </header>
  );
}
