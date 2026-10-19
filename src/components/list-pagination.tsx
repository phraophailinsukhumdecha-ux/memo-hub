'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ListPaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function ListPagination({ page, totalPages, totalItems, onPageChange }: ListPaginationProps) {
  const [inputValue, setInputValue] = useState(String(page));
  const [lastPage, setLastPage] = useState(page);
  if (page !== lastPage) {
    setLastPage(page);
    setInputValue(String(page));
  }

  const commitPage = () => {
    const n = parseInt(inputValue, 10);
    if (Number.isNaN(n)) {
      setInputValue(String(page));
      return;
    }
    const clamped = Math.min(Math.max(n, 1), totalPages);
    setInputValue(String(clamped));
    if (clamped !== page) onPageChange(clamped);
  };

  if (totalPages <= 1) {
    return (
      <div className="flex items-center justify-end pt-3 text-xs text-slate-500">
        {totalItems} รายการ
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between pt-3">
      <p className="text-xs text-slate-500">{totalItems} รายการ</p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-slate-700"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          ก่อนหน้า
        </Button>
        <span className="flex items-center gap-1 text-xs text-slate-600 whitespace-nowrap">
          หน้า
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={commitPage}
            onKeyDown={(e) => { if (e.key === 'Enter') commitPage(); }}
            className="h-8 w-14 text-center text-xs"
          />
          / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-slate-700"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          ถัดไป
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
