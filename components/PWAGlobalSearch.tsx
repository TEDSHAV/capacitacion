"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useGlobalSearch } from "@/lib/navigation/use-global-search";
import { useNavigationContext } from "@/lib/navigation/use-navigation-context";

interface PWAGlobalSearchProps {
  className?: string;
  onOpen?: () => void;
}

export function PWAGlobalSearch({ className = "", onOpen }: PWAGlobalSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const context = useNavigationContext();
  const { query, setQuery, results, hasResults } = useGlobalSearch(context);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      inputRef.current?.focus();
    }

    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, setQuery]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Button */}
      <button
        onClick={() => {
          onOpen?.();
          setIsOpen(!isOpen);
        }}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Global search"
        title="Buscar (Ctrl+K)"
      >
        <Search className="w-5 h-5 text-gray-700" />
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20">
          <div className="w-full max-w-2xl mx-4">
            {/* Search Input */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar páginas, servicios, certificados..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 outline-none text-sm"
                />
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {hasResults ? (
                  <div className="divide-y divide-gray-200">
                    {results.map((result) => (
                      <Link
                        key={result.id}
                        href={result.href}
                        onClick={() => {
                          setIsOpen(false);
                          setQuery("");
                        }}
                        className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {result.icon && (
                            <result.icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {result.label}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {result.breadcrumb}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : query.trim() ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No se encontraron resultados para "{query}"
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    Escribe para buscar páginas y servicios
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                <span>Presiona ESC para cerrar</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
