"use client";

import { QUICK_FILTERS, type QuickFilterKey } from "@/lib/filters";

type Props = {
  activeQuickFilters: QuickFilterKey[];
  onToggleQuickFilter: (key: QuickFilterKey) => void;
};

export default function QuickFilters({
  activeQuickFilters,
  onToggleQuickFilter,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_FILTERS.map((f) => {
        const active = activeQuickFilters.includes(f.key);
        return (
          <button
            key={f.key}
            type="button"
            onClick={() => onToggleQuickFilter(f.key)}
            className={[
              "h-9 rounded-full border px-3 text-sm font-medium transition-colors",
              active
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
            ].join(" ")}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

