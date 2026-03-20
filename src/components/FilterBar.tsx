"use client";

import QuickFilters from "@/components/QuickFilters";
import AdvancedFilters from "@/components/AdvancedFilters";
import type {
  DomainAdvancedFilters,
  QuickFilterKey,
  SortBy,
} from "@/lib/filters";

type Props = {
  activeQuickFilters: QuickFilterKey[];
  onToggleQuickFilter: (key: QuickFilterKey) => void;
  advancedFilters: DomainAdvancedFilters;
  onApplyAdvancedFilters: (next: DomainAdvancedFilters) => void;
  sortBy: SortBy;
  onChangeSortBy: (next: SortBy) => void;
  resultCount: number;
};

export default function FilterBar({
  activeQuickFilters,
  onToggleQuickFilter,
  advancedFilters,
  onApplyAdvancedFilters,
  sortBy,
  onChangeSortBy,
  resultCount,
}: Props) {
  return (
    <div className="mt-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-zinc-900">
            Quick Filters
          </div>
          <QuickFilters
            activeQuickFilters={activeQuickFilters}
            onToggleQuickFilter={onToggleQuickFilter}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-sm text-zinc-600 sm:block">
            {resultCount} result{resultCount === 1 ? "" : "s"}
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <span className="text-zinc-600">Sort</span>
            <select
              value={sortBy}
              onChange={(e) => onChangeSortBy(e.target.value as SortBy)}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-indigo-500/20 transition-shadow focus:ring-2"
            >
              <option value="length">By length</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4">
        <AdvancedFilters
          advancedFilters={advancedFilters}
          onApplyAdvancedFilters={onApplyAdvancedFilters}
        />
      </div>
    </div>
  );
}

