"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AVAILABLE_TLDS,
  type AdvancedFiltersFormValues,
  buildAdvancedFilters,
  advancedFiltersToForm,
  DEFAULT_ADVANCED_FILTERS,
  type DomainAdvancedFilters,
  type HyphenFilterOption,
  type NumbersFilterOption,
} from "@/lib/filters";

type Props = {
  advancedFilters: DomainAdvancedFilters;
  onApplyAdvancedFilters: (next: DomainAdvancedFilters) => void;
};

const NUMBERS_FILTERS: Array<{
  key: NumbersFilterOption;
  label: string;
  description?: string;
}> = [
  { key: "any", label: "Any" },
  { key: "no_numbers", label: "No numbers" },
  { key: "only_numbers", label: "Only numbers" },
  { key: "contains_numbers", label: "Contains numbers" },
];

function setTlds(
  current: string[],
  tld: string
): { next: string[]; selected: boolean } {
  const selected = current.includes(tld);
  return {
    selected,
    next: selected ? current.filter((x) => x !== tld) : [...current, tld],
  };
}

export default function AdvancedFilters({
  advancedFilters,
  onApplyAdvancedFilters,
}: Props) {
  const [open, setOpen] = useState(true);
  const [draft, setDraft] = useState<AdvancedFiltersFormValues>(() =>
    advancedFiltersToForm(advancedFilters)
  );

  useEffect(() => {
    setDraft(advancedFiltersToForm(advancedFilters));
  }, [advancedFilters]);

  const hyphenValue = draft.hyphenOption;

  const hyphenIncludeActive = hyphenValue === "include";
  const hyphenExcludeActive = hyphenValue === "exclude";

  function toggleHyphen(option: HyphenFilterOption) {
    setDraft((prev) => {
      const nextValue = prev.hyphenOption === option ? undefined : option;
      return { ...prev, hyphenOption: nextValue };
    });
  }

  const canReset = useMemo(() => {
    const normalizedDraft = buildAdvancedFilters(draft);
    return (
      JSON.stringify(normalizedDraft) !== JSON.stringify(advancedFilters)
    );
  }, [advancedFilters, draft]);

  function handleApply() {
    onApplyAdvancedFilters(buildAdvancedFilters(draft));
  }

  function handleReset() {
    setDraft(advancedFiltersToForm(DEFAULT_ADVANCED_FILTERS));
    onApplyAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-zinc-900">
            Advanced Filters
          </div>
          <div className="mt-0.5 text-xs text-zinc-600">
            Refine results with tld, length, keywords, and patterns.
          </div>
        </div>
        <div className="flex items-center gap-2 text-zinc-700">
          <span className="text-xs font-medium">{open ? "Hide" : "Show"}</span>
          <span
            className={[
              "inline-block transition-transform",
              open ? "rotate-180" : "rotate-0",
            ].join(" ")}
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
      </button>

      <div
        className={[
          "border-t border-zinc-200 transition-[max-height,opacity] duration-300",
          open ? "max-h-[900px] opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
      >
        <div className="p-4 pt-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  TLD
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TLDS.map((tld) => {
                    const active = draft.tlds.includes(tld);
                    return (
                      <button
                        key={tld}
                        type="button"
                        onClick={() => {
                          setDraft((prev) => {
                            const { next } = setTlds(prev.tlds, tld);
                            return { ...prev, tlds: next };
                          });
                        }}
                        className={[
                          "h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                          active
                            ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                        ].join(" ")}
                      >
                        {tld}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-zinc-600">
                    Min Length
                  </span>
                  <input
                    value={draft.lengthMinText}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        lengthMinText: e.target.value,
                      }))
                    }
                    type="number"
                    min={0}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-indigo-500/20 transition-shadow focus:ring-2"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-zinc-600">
                    Max Length
                  </span>
                  <input
                    value={draft.lengthMaxText}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        lengthMaxText: e.target.value,
                      }))
                    }
                    type="number"
                    min={0}
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-indigo-500/20 transition-shadow focus:ring-2"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Numbers
                </div>
                <div className="flex flex-col gap-2">
                  {NUMBERS_FILTERS.map((opt) => (
                    <label
                      key={opt.key}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 transition-colors hover:bg-zinc-50"
                    >
                      <span className="font-medium">{opt.label}</span>
                      <input
                        type="radio"
                        name="numbers-filter"
                        checked={draft.numbersOption === opt.key}
                        onChange={() =>
                          setDraft((prev) => ({
                            ...prev,
                            numbersOption: opt.key,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Hyphen
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleHyphen("include")}
                    className={[
                      "h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                      hyphenIncludeActive
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    Include
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleHyphen("exclude")}
                    className={[
                      "h-9 rounded-full border px-3 text-sm font-medium transition-colors",
                      hyphenExcludeActive
                        ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                    ].join(" ")}
                  >
                    Exclude
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3 lg:col-span-2">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-zinc-600">
                    Include Keywords
                  </span>
                  <input
                    value={draft.includeKeywordsText}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        includeKeywordsText: e.target.value,
                      }))
                    }
                    placeholder="Comma-separated (e.g. ai, agent)"
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-indigo-500/20 transition-shadow focus:ring-2"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-zinc-600">
                    Exclude Keywords
                  </span>
                  <input
                    value={draft.excludeKeywordsText}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        excludeKeywordsText: e.target.value,
                      }))
                    }
                    placeholder="Comma-separated"
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-indigo-500/20 transition-shadow focus:ring-2"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-zinc-600">
                    Starts With
                  </span>
                  <input
                    value={draft.startsWithText}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        startsWithText: e.target.value,
                      }))
                    }
                    placeholder="e.g. hyper"
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-indigo-500/20 transition-shadow focus:ring-2"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-zinc-600">
                    Ends With
                  </span>
                  <input
                    value={draft.endsWithText}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        endsWithText: e.target.value,
                      }))
                    }
                    placeholder="e.g. flow"
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-indigo-500/20 transition-shadow focus:ring-2"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleReset}
              disabled={!canReset}
              className={[
                "h-10 rounded-md border px-4 text-sm font-medium transition-colors",
                !canReset
                  ? "cursor-not-allowed border-zinc-200 bg-white text-zinc-400"
                  : "border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
              ].join(" ")}
            >
              Reset Filters
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="h-10 rounded-md bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

