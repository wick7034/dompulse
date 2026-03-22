"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import DomainTable from "@/components/DomainTable";
import FilterBar from "@/components/FilterBar";
import type { Domain } from "@/types/domain";
import {
  DEFAULT_ADVANCED_FILTERS,
  type DomainAdvancedFilters,
  filterDomains,
  sortDomains,
  type QuickFilterKey,
  type SortBy,
} from "@/lib/filters";
import type { DomainQueryFilters } from "@/lib/getFilteredDomains";

const PAGE_SIZE = 25;

type Props = {
  initialDomains: Domain[];
};

export default function DomainsExplorer({ initialDomains }: Props) {
  const [activeQuickFilters, setActiveQuickFilters] = useState<QuickFilterKey[]>(
    []
  );
  const [advancedFilters, setAdvancedFilters] =
    useState<DomainAdvancedFilters>(DEFAULT_ADVANCED_FILTERS);
  const [sortBy, setSortBy] = useState<SortBy>("length");
  const [currentPage, setCurrentPage] = useState(1);

  const [serverDomains, setServerDomains] = useState<Domain[]>(initialDomains);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadedAllDomains, setLoadedAllDomains] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);

  const serverFilters: DomainQueryFilters = useMemo(() => {
    const quickBrandable = activeQuickFilters.includes("brandable");
    const quickShort = activeQuickFilters.includes("short_domains");

    const noNumbersQuick = activeQuickFilters.includes("no_numbers");
    const noHyphensQuick = activeQuickFilters.includes("no_hyphens");

    const noNumbersAdvanced = advancedFilters.numbersOption === "no_numbers";
    const noHyphensAdvanced = advancedFilters.hyphenOption === "exclude";

    const noNumbers = noNumbersQuick || noNumbersAdvanced || quickBrandable;
    const noHyphens = noHyphensQuick || noHyphensAdvanced || quickBrandable;

    // Merge supported length constraints.
    const baseMin = advancedFilters.lengthMin;
    const baseMax = advancedFilters.lengthMax;

    const minFromBrandable = quickBrandable ? 5 : undefined;
    const maxFromBrandable = quickBrandable ? 12 : undefined;
    const maxFromShort = quickShort ? 5 : undefined;

    const effectiveMin =
      minFromBrandable !== undefined
        ? baseMin !== undefined
          ? Math.max(baseMin, minFromBrandable)
          : minFromBrandable
        : baseMin;

    const effectiveMaxCandidates = [baseMax, maxFromBrandable, maxFromShort]
      .filter((x): x is number => x !== undefined)
      .sort((a, b) => a - b);

    const effectiveMax = effectiveMaxCandidates.length
      ? effectiveMaxCandidates[0]
      : undefined;

    return {
      tlds: advancedFilters.tlds,
      noNumbers,
      noHyphens,
      lengthMin: effectiveMin,
      lengthMax: effectiveMax,
      startsWith: advancedFilters.startsWith,
      endsWith: advancedFilters.endsWith,
      includeKeywords: advancedFilters.includeKeywords,
      excludeKeywords: advancedFilters.excludeKeywords,
    };
  }, [activeQuickFilters, advancedFilters]);

  const clientRemainder = useMemo(() => {
    const quickRemainder = activeQuickFilters.filter((k) => k === "ai_domains");

    const serverHandlesLength =
      serverFilters.lengthMin !== undefined ||
      serverFilters.lengthMax !== undefined;
    const serverHandlesTlds =
      serverFilters.tlds !== undefined && serverFilters.tlds.length > 0;

    const advancedForClient: DomainAdvancedFilters = {
      ...advancedFilters,
      // Supported by server:
      tlds: serverHandlesTlds ? [] : advancedFilters.tlds,
      lengthMin: serverHandlesLength ? undefined : advancedFilters.lengthMin,
      lengthMax: serverHandlesLength ? undefined : advancedFilters.lengthMax,
      startsWith: undefined, // Handled by server
      endsWith: undefined, // Handled by server
      includeKeywords: [], // Handled by server
      excludeKeywords: [], // Handled by server
      // Only neutralize when the *advanced* filter is the one requesting it.
      // Otherwise we would lose conflicting advanced constraints.
      numbersOption:
        advancedFilters.numbersOption === "no_numbers"
          ? "any"
          : advancedFilters.numbersOption,
      hyphenOption:
        advancedFilters.hyphenOption === "exclude"
          ? undefined
          : advancedFilters.hyphenOption,
    };

    return filterDomains(serverDomains, quickRemainder, advancedForClient);
  }, [activeQuickFilters, advancedFilters, serverDomains, serverFilters]);

  const sorted = useMemo(() => {
    return sortDomains(clientRemainder, sortBy);
  }, [clientRemainder, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const visibleDomains = sorted.slice(startIndex, endIndex);

  // Function to fetch more domains from server
  const fetchMoreDomains = async () => {
    if (loadedAllDomains || isFetching) return;

    setIsFetching(true);
    try {
      const params = new URLSearchParams();
      if (serverFilters.tlds && serverFilters.tlds.length > 0) {
        params.set("tlds", serverFilters.tlds.join(","));
      }
      if (serverFilters.noNumbers) params.set("no_numbers", "1");
      if (serverFilters.noHyphens) params.set("no_hyphens", "1");
      if (serverFilters.lengthMin !== undefined)
        params.set("length_min", String(serverFilters.lengthMin));
      if (serverFilters.lengthMax !== undefined)
        params.set("length_max", String(serverFilters.lengthMax));
      if (serverFilters.startsWith)
        params.set("starts_with", serverFilters.startsWith);
      if (serverFilters.endsWith)
        params.set("ends_with", serverFilters.endsWith);
      if (
        serverFilters.includeKeywords &&
        serverFilters.includeKeywords.length > 0
      ) {
        params.set("include_keywords", serverFilters.includeKeywords.join(","));
      }
      if (
        serverFilters.excludeKeywords &&
        serverFilters.excludeKeywords.length > 0
      ) {
        params.set("exclude_keywords", serverFilters.excludeKeywords.join(","));
      }

      params.set("offset", String(serverDomains.length));
      params.set("limit", "500");

      const res = await fetch(`/api/domains/filtered?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch more domains");
      const json = (await res.json()) as { domains: Domain[] };

      if (json.domains && json.domains.length > 0) {
        setServerDomains((prev) => [...prev, ...json.domains]);
      } else {
        setLoadedAllDomains(true);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setIsFetching(false);
    }
  };

  // Fetch more domains when approaching end of loaded domains
  useEffect(() => {
    const domainsNeededForPage = currentPage * PAGE_SIZE;
    const loadBuffer = 100; // Load more when we're within 100 items of the end
    if (
      domainsNeededForPage + loadBuffer > serverDomains.length &&
      !loadedAllDomains
    ) {
      fetchMoreDomains();
    }
  }, [currentPage, serverDomains.length, loadedAllDomains]);

  useEffect(() => {
    // Build a stable query string based on the supported server filters.
    const params = new URLSearchParams();
    if (serverFilters.tlds && serverFilters.tlds.length > 0) {
      params.set("tlds", serverFilters.tlds.join(","));
    }
    if (serverFilters.noNumbers) params.set("no_numbers", "1");
    if (serverFilters.noHyphens) params.set("no_hyphens", "1");
    if (serverFilters.lengthMin !== undefined)
      params.set("length_min", String(serverFilters.lengthMin));
    if (serverFilters.lengthMax !== undefined)
      params.set("length_max", String(serverFilters.lengthMax));
    if (serverFilters.startsWith)
      params.set("starts_with", serverFilters.startsWith);
    if (serverFilters.endsWith)
      params.set("ends_with", serverFilters.endsWith);
    if (
      serverFilters.includeKeywords &&
      serverFilters.includeKeywords.length > 0
    ) {
      params.set("include_keywords", serverFilters.includeKeywords.join(","));
    }
    if (
      serverFilters.excludeKeywords &&
      serverFilters.excludeKeywords.length > 0
    ) {
      params.set("exclude_keywords", serverFilters.excludeKeywords.join(","));
    }

    const queryKey = params.toString();
    const isDefault =
      queryKey === "" ||
      queryKey === "no_hyphens=0" ||
      queryKey === "no_numbers=0";

    // For default state, reuse the initialDomains passed from server.
    if (isDefault) {
      setServerDomains(initialDomains);
      setFetchError(null);
      setIsFetching(false);
      setCurrentPage(1);
      setLoadedAllDomains(false);
      return;
    }

    setFetchError(null);
    setIsFetching(true);

    if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/domains/filtered?${queryKey}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to fetch filtered domains");
        }
        const json = (await res.json()) as { domains: Domain[] };
        setServerDomains(json.domains ?? []);
        setCurrentPage(1);
        setLoadedAllDomains(false);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : "Fetch failed");
      } finally {
        setIsFetching(false);
      }
    }, 180);

    return () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [serverFilters, initialDomains]);

  return (
    <>
      <FilterBar
        activeQuickFilters={activeQuickFilters}
        onToggleQuickFilter={(key) => {
          setCurrentPage(1);
          setActiveQuickFilters((prev) => {
            if (prev.includes(key)) return prev.filter((k) => k !== key);
            return [...prev, key];
          });
        }}
        advancedFilters={advancedFilters}
        onApplyAdvancedFilters={(next) => {
          setCurrentPage(1);
          setAdvancedFilters(next);
        }}
        sortBy={sortBy}
        onChangeSortBy={(next) => {
          setCurrentPage(1);
          setSortBy(next);
        }}
        resultCount={sorted.length}
      />

      <div className="mt-4 rounded-lg border border-zinc-200 bg-white shadow-sm">
        {isFetching ? (
          <div className="flex items-center justify-center px-4 py-16 text-sm text-zinc-600">
            Loading domains...
          </div>
        ) : fetchError ? (
          <div className="flex items-start justify-center px-4 py-16 text-sm text-zinc-600">
            {fetchError}
          </div>
        ) : (
          <DomainTable domains={visibleDomains} />
        )}
      </div>

      {sorted.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-center gap-4 pointer-events-auto" onClickCapture={() => {
          const el = document.activeElement as HTMLElement;
          if (el && el.tagName !== 'BUTTON') {
            el.blur?.();
          }
        }}>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const el = document.activeElement as HTMLElement;
                el?.blur();
                setCurrentPage((p) => Math.max(p - 1, 1));
              }}
              disabled={currentPage === 1 || isFetching}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center gap-1 flex-wrap justify-center">
              {totalPages <= 7 ? (
                // Show all pages if 7 or fewer
                Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={(e) => {
                        e.preventDefault();
                        const el = document.activeElement as HTMLElement;
                        el?.blur();
                        setCurrentPage(page);
                      }}
                      className={`h-10 w-10 rounded-md text-sm font-medium transition-colors ${
                        currentPage === page
                          ? "border border-indigo-200 bg-indigo-50 text-indigo-700"
                          : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {page}
                    </button>
                  )
                )
              ) : (
                // Show smart pagination for many pages
                <>
                  {currentPage > 3 && (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.activeElement as HTMLElement;
                          el?.blur();
                          setCurrentPage(1);
                        }}
                        className="h-10 w-10 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        1
                      </button>
                      {currentPage > 4 && (
                        <span className="px-2 text-zinc-600">...</span>
                      )}
                    </>
                  )}

                  {Array.from(
                    { length: 5 },
                    (_, i) => currentPage - 2 + i
                  )
                    .filter((p) => p > 0 && p <= totalPages)
                    .map((page) => (
                      <button
                        key={page}
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.activeElement as HTMLElement;
                          el?.blur();
                          setCurrentPage(page);
                        }}
                        className={`h-10 w-10 rounded-md text-sm font-medium transition-colors ${
                          currentPage === page
                            ? "border border-indigo-200 bg-indigo-50 text-indigo-700"
                            : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                  {currentPage < totalPages - 2 && (
                    <>
                      {currentPage < totalPages - 3 && (
                        <span className="px-2 text-zinc-600">...</span>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.activeElement as HTMLElement;
                          el?.blur();
                          setCurrentPage(totalPages);
                        }}
                        className="h-10 w-10 rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                const el = document.activeElement as HTMLElement;
                el?.blur();
                setCurrentPage((p) => Math.min(p + 1, totalPages));
              }}
              disabled={currentPage === totalPages || isFetching}
              className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>

          <div className="text-xs text-zinc-600">
            Page {currentPage} of {totalPages} ({sorted.length} results)
          </div>
        </div>
      )}
    </>
  );
}

