"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface ClientePaginationProps {
  currentPage: number;
  totalCount: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export function ClientePagination({
  currentPage,
  totalCount,
  itemsPerPage,
  onPageChange,
}: ClientePaginationProps) {
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-3">
      <p className="text-sm text-gray-600">
        Mostrando {from}–{to} de {totalCount} resultados
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-gray-700 px-2">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
