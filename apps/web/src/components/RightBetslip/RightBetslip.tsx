"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { X, Trophy } from "lucide-react";
import { useBetslipStore, type BetslipSelection } from "@/stores/betslipStore";
import { createSlipAction } from "@/server/actions/slipActions";
import { getCurrentUserAction } from "@/server/actions/userActions";
import {
  transformSelectionsToLines,
  createOddsSnapshot,
} from "./betslipUtils";
import { getSelectionLabel, getMarketLabel } from "@/stores/betslipUtils";

interface RightBetslipProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function RightBetslip({ isOpen = true, onClose }: RightBetslipProps) {
  const router = useRouter();
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const selections = useBetslipStore((state) => state.selections);
  const stake = useBetslipStore((state) => state.stake);
  const removeSelection = useBetslipStore((state) => state.removeSelection);
  const setStake = useBetslipStore((state) => state.setStake);
  const clearBetslip = useBetslipStore((state) => state.clearBetslip);

  // Calculate potential return
  const totalOdds = selections.length > 0
    ? selections.reduce((acc, selection) => acc * selection.odds, 1)
    : 0;
  const potentialReturn = stake > 0 && selections.length > 0
    ? stake * totalOdds
    : 0;

  const handleStakeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === "") {
      setStake(0);
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && isFinite(numValue) && numValue >= 0) {
      setStake(numValue);
    }
  };

  const handlePlaceBet = async () => {
    if (selections.length === 0) {
      toast.error("Kuponunuza en az bir bahis ekleyin");
      return;
    }

    if (stake <= 0) {
      toast.error("Geçerli bir bahis tutarı girin");
      return;
    }

    if (selections.some((s) => s.odds <= 0)) {
      toast.error("Geçersiz oran tespit edildi. Lütfen yenileyin ve tekrar deneyin.");
      return;
    }

    setIsPlacingBet(true);

    try {
      const userResult = await getCurrentUserAction();
      if (!userResult.success || !userResult.uid) {
        toast.error("Yetkisiz. Lütfen tekrar giriş yapın.");
        setIsPlacingBet(false);
        return;
      }

      if (!userResult.dealerId) {
        toast.error("Hesabınız bir bayiyi ile ilişkilendirilmemiş. Lütfen destek ile iletişime geçin.");
        setIsPlacingBet(false);
        return;
      }

      const lines = transformSelectionsToLines(selections);
      const oddsSnapshot = createOddsSnapshot(selections);

      const result = await createSlipAction({
        uid: userResult.uid,
        dealerId: userResult.dealerId,
        stake,
        lines,
      });

      if (result.success) {
        toast.success("Bahis başarıyla alındı! Bol şans!");
        clearBetslip();
        if (onClose) onClose();
        router.push("/my/slips");
      } else {
        toast.error(result.error || "Bahis alınamadı. Lütfen tekrar deneyin.");
      }
    } catch (error) {
      console.error("Error placing bet:", error);
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsPlacingBet(false);
    }
  };

  const betslipContent = (
    <>
      {/* Kupon Başlığı */}
      <div className="p-4 bg-[#0b0b0f] border-b border-white/5 flex items-center justify-between relative overflow-hidden">
        <div className="z-10 flex items-center gap-2">
          <div className="bg-[#00ffa3] text-black text-xs font-bold px-2 py-0.5 rounded">
            KUPON
          </div>
          <span className="text-white font-bold text-sm tracking-wide">BAHİSLERİM</span>
        </div>
        <div className="z-10 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
          {selections.length}
        </div>
        {/* Dekoratif Arkaplan */}
        <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-[#00ffa3]/10 to-transparent skew-x-12"></div>
      </div>

      {/* Seçim Listesi */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {selections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center opacity-30">
            <Trophy size={48} className="mb-4 text-gray-500" />
            <p className="text-sm font-bold text-gray-300">Kuponunuz boş</p>
            <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
              Bahis eklemek için oranlara tıklayın
            </p>
          </div>
        ) : (
          selections.map((sel, index) => {
            const selectionLabel = getSelectionLabel(sel.selectionKey, sel.marketKey);
            const marketLabel = getMarketLabel(sel.marketKey);
            
            return (
              <div
                key={`${sel.fixtureId}-${sel.marketKey}-${sel.selectionKey}`}
                className="bg-[#1f1f26] rounded-xl p-3 relative group border border-transparent hover:border-white/10 transition-all shadow-lg"
              >
                <button
                  onClick={() => removeSelection(index)}
                  className="absolute top-2 right-2 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md text-gray-500 transition-colors z-10"
                >
                  <X size={14} />
                </button>

                <div className="flex items-start gap-3">
                  <div className="w-1 bg-[#00ffa3] h-10 rounded-full mt-1"></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#00ffa3] font-bold mb-0.5">
                      {selectionLabel}
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
                      {marketLabel}
                    </div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-1 truncate">
                      {sel.homeTeam} <span className="text-gray-700">vs</span> {sel.awayTeam}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-3 right-3 bg-[#00ffa3]/10 text-[#00ffa3] px-2 py-0.5 rounded text-xs font-bold border border-[#00ffa3]/20">
                  {sel.odds.toFixed(2)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Kupon Altı / Özet */}
      <div className="p-4 bg-[#0b0b0f] border-t border-white/10 space-y-4">
        {/* Bahis Miktarı Girişi */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase">
            <span>Toplam Oran</span>
            <span className="text-[#00ffa3]">
              {selections.length > 0 ? totalOdds.toFixed(2) : "0.00"}
            </span>
          </div>

          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold group-focus-within:text-[#00ffa3] transition-colors">
              ₺
            </span>
            <input
              type="number"
              value={stake || ""}
              onChange={handleStakeChange}
              placeholder="Bahis Miktarı"
              className="w-full bg-[#15151a] border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white font-bold focus:outline-none focus:border-[#00ffa3] focus:shadow-[0_0_15px_rgba(0,255,163,0.1)] transition-all"
            />
          </div>
        </div>

        {/* Kazanç Özeti */}
        <div className="bg-[#15151a] rounded-xl p-3 flex justify-between items-center border border-white/5">
          <span className="text-xs text-gray-400">Olası Kazanç</span>
          <span className="text-lg font-black text-white tracking-tight">
            ₺{potentialReturn.toFixed(2)}
          </span>
        </div>

        {/* Aksiyon Butonu */}
        <button
          onClick={handlePlaceBet}
          disabled={selections.length === 0 || isPlacingBet}
          className={cn(
            "w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-300 transform active:scale-95",
            selections.length > 0 && !isPlacingBet
              ? "bg-gradient-to-r from-[#00ffa3] to-[#00ce84] text-black shadow-[0_0_30px_rgba(0,255,163,0.3)] hover:shadow-[0_0_50px_rgba(0,255,163,0.5)]"
              : "bg-gray-800 text-gray-600 cursor-not-allowed border border-white/5"
          )}
        >
          {isPlacingBet ? "İşleniyor..." : "Bahsi Onayla"}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar - always visible */}
      <aside className="hidden xl:flex flex-col w-[350px] bg-[#15151a] border-l border-white/10 shadow-2xl h-full">
        {betslipContent}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="xl:hidden fixed inset-0 z-[100]">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          ></div>
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-[#15151a] shadow-2xl flex flex-col">
            <div className="flex justify-end p-2 border-b border-white/10">
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white/10 rounded transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            {betslipContent}
          </div>
        </div>
      )}
    </>
  );
}
