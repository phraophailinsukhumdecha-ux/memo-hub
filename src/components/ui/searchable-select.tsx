'use client';

import React, { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function SearchableSelect({ value, onChange, options, placeholder = 'เลือก' }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  const handleSelect = (opt: string) => {
    onChange(opt === value ? '' : opt);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between border border-input bg-transparent px-3 py-2 text-sm text-slate-900 rounded-md hover:bg-accent hover:text-accent-foreground"
      >
        <span className={value ? 'text-slate-900' : 'text-slate-500'}>{value || placeholder}</span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(''); }} />
          <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg">
            <div className="p-2 border-b">
              <Input
                autoFocus
                placeholder="พิมพ์เพื่อค้นหา..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8"
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setOpen(false); setSearch(''); }
                  if (e.key === 'Enter' && filtered.length > 0) { handleSelect(filtered[0]); e.preventDefault(); }
                }}
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.length === 0 && (
                <p className="text-sm text-slate-700 text-center py-3">ไม่พบรายการ</p>
              )}
              {filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-sm text-slate-900 hover:bg-slate-100 ${opt === value ? 'bg-blue-50 font-medium' : ''}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
