"use client";

import Link from "next/link";
import { Facebook, Twitter, Instagram, Mail, Shield, FileText, Info } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0f0f13] border-t border-white/5 mt-auto relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Brand Section */}
          <div className="space-y-3 sm:space-y-4">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[#00ffa3] to-[#00ce84] rounded-lg flex items-center justify-center text-black font-black text-lg sm:text-xl italic">
                B
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-lg sm:text-xl font-bold tracking-tighter text-white">
                  BET<span className="text-[#00ffa3]">PRIME</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 uppercase tracking-[0.2em]">
                  Yeni Nesil Bahis
                </span>
              </div>
            </Link>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Güvenilir ve eğlenceli bahis deneyimi için yanınızdayız. 
              Sorumlu oyun ilkelerimizle her zaman güvende kalın.
            </p>
            {/* Social Media */}
            <div className="flex items-center gap-2 sm:gap-3 pt-2">
              <a
                href="#"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-gray-400 hover:text-[#00ffa3] transition-all"
                aria-label="Facebook"
              >
                <Facebook size={14} className="sm:w-4 sm:h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-gray-400 hover:text-[#00ffa3] transition-all"
                aria-label="Twitter"
              >
                <Twitter size={14} className="sm:w-4 sm:h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-gray-400 hover:text-[#00ffa3] transition-all"
                aria-label="Instagram"
              >
                <Instagram size={14} className="sm:w-4 sm:h-4" />
              </a>
              <a
                href="#"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-gray-400 hover:text-[#00ffa3] transition-all"
                aria-label="Email"
              >
                <Mail size={14} className="sm:w-4 sm:h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-xs sm:text-sm mb-3 sm:mb-4 uppercase tracking-wider">
              Hızlı Linkler
            </h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-gray-400 hover:text-[#00ffa3] text-sm transition-colors flex items-center gap-2"
                >
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  Spor Bahisleri
                </Link>
              </li>
              <li>
                <Link
                  href="/live"
                  className="text-gray-400 hover:text-[#00ffa3] text-sm transition-colors flex items-center gap-2"
                >
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  Canlı Bahis
                </Link>
              </li>
              <li>
                <Link
                  href="/fixtures"
                  className="text-gray-400 hover:text-[#00ffa3] text-sm transition-colors flex items-center gap-2"
                >
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  Maçlar
                </Link>
              </li>
              <li>
                <Link
                  href="/my/slips"
                  className="text-gray-400 hover:text-[#00ffa3] text-sm transition-colors flex items-center gap-2"
                >
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  Bahislerim
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Info */}
          <div>
            <h3 className="text-white font-bold text-xs sm:text-sm mb-3 sm:mb-4 uppercase tracking-wider">
              Bilgi & Destek
            </h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-[#00ffa3] text-sm transition-colors flex items-center gap-2"
                >
                  <Info size={14} className="text-gray-500" />
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-[#00ffa3] text-sm transition-colors flex items-center gap-2"
                >
                  <Mail size={14} className="text-gray-500" />
                  İletişim
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-[#00ffa3] text-sm transition-colors flex items-center gap-2"
                >
                  <Shield size={14} className="text-gray-500" />
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-gray-400 hover:text-[#00ffa3] text-sm transition-colors flex items-center gap-2"
                >
                  <FileText size={14} className="text-gray-500" />
                  Kullanım Şartları
                </Link>
              </li>
            </ul>
          </div>

          {/* Responsible Gaming */}
          <div>
            <h3 className="text-white font-bold text-xs sm:text-sm mb-3 sm:mb-4 uppercase tracking-wider">
              Sorumlu Oyun
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-3 sm:mb-4">
              18 yaş altındaki kişilerin bahis oynaması yasaktır. 
              Sorumlu oyun ilkelerine uyun ve limitlerinizi belirleyin.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-400 border border-white/5">
                18+
              </span>
              <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-400 border border-white/5">
                Sorumlu Oyun
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 sm:pt-8 border-t border-white/5">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <p className="text-[10px] sm:text-xs text-gray-500 text-center sm:text-left">
              © {currentYear} BETPRIME. Tüm hakları saklıdır.
            </p>
            <div className="flex items-center gap-4 sm:gap-6 text-[10px] sm:text-xs text-gray-500">
              <span className="hidden sm:inline">Lisanslı ve Güvenilir</span>
              <span className="text-[#00ffa3]">SSL Güvenli</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

