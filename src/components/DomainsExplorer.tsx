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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadMoreOffset, setLoadMoreOffset] = useState(0);

  const [serverDomains, setServerDomains] = useState<Domain[]>(initialDomains);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
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

  const visibleDomains = sorted.slice(0, visibleCount);
  const canLoadMore = visibleCount < sorted.length;

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
      setVisibleCount(PAGE_SIZE);
      setLoadMoreOffset(0);
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
        setVisibleCount(PAGE_SIZE);
        setLoadMoreOffset(0);
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
          setVisibleCount(PAGE_SIZE);
          setLoadMoreOffset(0);
          setActiveQuickFilters((prev) => {
            if (prev.includes(key)) return prev.filter((k) => k !== key);
            return [...prev, key];
          });
        }}
        advancedFilters={advancedFilters}
        onApplyAdvancedFilters={(next) => {
          setVisibleCount(PAGE_SIZE);
          setLoadMoreOffset(0);
          setAdvancedFilters(next);
        }}
        sortBy={sortBy}
        onChangeSortBy={(next) => {
          setVisibleCount(PAGE_SIZE);
          setLoadMoreOffset(0);
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
          <>
            <DomainTable domains={visibleDomains} />
            {sorted.length > 0 && canLoadMore && (
              <div className="flex justify-center border-t border-zinc-200 px-4 py-4">
                <button
                  type="button"
                  onClick={async () => {
                    // Blur any focused input to prevent mobile keyboard from opening
                    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    
                    // Check if we need to fetch more from server
                    const newVisibleCount = Math.min(visibleCount + PAGE_SIZE, sorted.length);
                    if (newVisibleCount >= sorted.length && sorted.length === serverDomains.length) {
                      // Fetch more domains from server
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
                        
                        const newOffset = loadMoreOffset + 500;
                        params.set("offset", String(newOffset));
                        params.set("limit", "500");
                        
                        const res = await fetch(`/api/domains/filtered?${params.toString()}`);
                        if (!res.ok) throw new Error("Failed to fetch more domains");
                        const json = (await res.json()) as { domains: Domain[] };
                        
                        if (json.domains && json.domains.length > 0) {
                          setServerDomains((prev) => [...prev, ...json.domains]);
                          setLoadMoreOffset(newOffset);
                        }
                      } catch (err) {
                        setFetchError(err instanceof Error ? err.message : "Failed to load more");
                      } finally {
                        setIsFetching(false);
                      }
                    }
                    
                    setVisibleCount((n) => Math.min(n + PAGE_SIZE, sorted.length));
                  }}
                  disabled={isFetching}
                  className="h-10 rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFetching ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

