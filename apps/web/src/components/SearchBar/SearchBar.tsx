"use client";

import { Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  className?: string;
}

export function SearchBar({ 
  placeholder = "Search", 
  onSearch,
  className = "" 
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <form 
      ref={formRef}
      className={`inline-flex items-center bg-gradient-to-r from-bet365-green-dark to-bet365-green text-white p-2.5 rounded border transition-all ${
        isFocused ? "border-white/40" : "border-white/20"
      } ${className}`}
      onSubmit={handleSubmit}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        className={`bg-transparent text-white border-none outline-none transition-all duration-500 placeholder:text-white/70 ${
          isFocused ? "w-[200px] pl-2" : "w-0"
        }`}
      />
      <button
        type="button"
        className="grid place-items-center w-6 h-6 cursor-pointer text-white hover:text-white/80 transition-colors flex-shrink-0"
        onClick={() => {
          if (!isFocused) {
            setIsFocused(true);
            inputRef.current?.focus();
          } else {
            onSearch?.(query);
          }
        }}
      >
        <Search size={18} />
      </button>
    </form>
  );
}

