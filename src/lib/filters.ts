import type { Domain } from "@/types/domain";

export type QuickFilterKey =
  | "brandable"
  | "ai_domains"
  | "no_numbers"
  | "no_hyphens"
  | "short_domains";

export const QUICK_FILTERS: Array<{ key: QuickFilterKey; label: string }> = [
  { key: "brandable", label: "Brandable" },
  { key: "ai_domains", label: "AI Domains" },
  { key: "no_numbers", label: "No Numbers" },
  { key: "no_hyphens", label: "No Hyphens" },
  { key: "short_domains", label: "Short Domains (≤5 chars)" },
];

const AI_NAME_TOKENS = ["ai", "gpt", "agent", "bot"] as const;

export type NumbersFilterOption =
  | "any"
  | "no_numbers"
  | "only_numbers"
  | "contains_numbers";

export type HyphenFilterOption = "include" | "exclude";

export type TldOption = ".com" | ".ai" | ".xyz" | ".io" | ".org" | ".app";

export const AVAILABLE_TLDS: TldOption[] = [".com", ".ai", ".xyz", ".io", ".org", ".app"];

export type SortBy = "length" | "alphabetical";

export type DomainAdvancedFilters = {
  tlds: string[]; // empty array means "any"
  lengthMin?: number;
  lengthMax?: number;
  numbersOption: NumbersFilterOption;
  hyphenOption?: HyphenFilterOption;
  includeKeywords: string[];
  excludeKeywords: string[];
  startsWith?: string;
  endsWith?: string;
};

export type AdvancedFiltersFormValues = {
  tlds: string[];
  lengthMinText: string;
  lengthMaxText: string;
  numbersOption: NumbersFilterOption;
  hyphenOption?: HyphenFilterOption;
  includeKeywordsText: string;
  excludeKeywordsText: string;
  startsWithText: string;
  endsWithText: string;
};

function parseOptionalNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return undefined;
  return value;
}

function normalizeKeywordsCSV(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function advancedFiltersToForm(
  advanced: DomainAdvancedFilters
): AdvancedFiltersFormValues {
  return {
    tlds: advanced.tlds,
    lengthMinText:
      advanced.lengthMin === undefined ? "" : String(advanced.lengthMin),
    lengthMaxText:
      advanced.lengthMax === undefined ? "" : String(advanced.lengthMax),
    numbersOption: advanced.numbersOption,
    hyphenOption: advanced.hyphenOption,
    includeKeywordsText: advanced.includeKeywords.join(", "),
    excludeKeywordsText: advanced.excludeKeywords.join(", "),
    startsWithText: advanced.startsWith ?? "",
    endsWithText: advanced.endsWith ?? "",
  };
}

export function buildAdvancedFilters(
  form: AdvancedFiltersFormValues
): DomainAdvancedFilters {
  const lengthMin = parseOptionalNumber(form.lengthMinText);
  const lengthMax = parseOptionalNumber(form.lengthMaxText);

  // If both are provided and reversed, swap to keep filtering intuitive.
  const normalizedRange =
    lengthMin !== undefined && lengthMax !== undefined && lengthMin > lengthMax
      ? { lengthMin: lengthMax, lengthMax: lengthMin }
      : { lengthMin, lengthMax };

  const startsWith = form.startsWithText.trim().toLowerCase();
  const endsWith = form.endsWithText.trim().toLowerCase();

  return {
    tlds: form.tlds,
    lengthMin: normalizedRange.lengthMin,
    lengthMax: normalizedRange.lengthMax,
    numbersOption: form.numbersOption,
    hyphenOption: form.hyphenOption,
    includeKeywords: normalizeKeywordsCSV(form.includeKeywordsText),
    excludeKeywords: normalizeKeywordsCSV(form.excludeKeywordsText),
    startsWith: startsWith ? startsWith : undefined,
    endsWith: endsWith ? endsWith : undefined,
  };
}

export const DEFAULT_ADVANCED_FILTERS: DomainAdvancedFilters = {
  tlds: [],
  lengthMin: undefined,
  lengthMax: undefined,
  numbersOption: "any",
  hyphenOption: undefined,
  includeKeywords: [],
  excludeKeywords: [],
  startsWith: undefined,
  endsWith: undefined,
};

export function filterDomains(
  domains: Domain[],
  quickFilters: QuickFilterKey[],
  advanced: DomainAdvancedFilters
): Domain[] {
  if (domains.length === 0) return [];

  const hasQuickBrandable = quickFilters.includes("brandable");
  const hasQuickAiDomains = quickFilters.includes("ai_domains");
  const hasQuickNoNumbers = quickFilters.includes("no_numbers");
  const hasQuickNoHyphens = quickFilters.includes("no_hyphens");
  const hasQuickShort = quickFilters.includes("short_domains");

  const includeKeywords = advanced.includeKeywords;
  const excludeKeywords = advanced.excludeKeywords;
  const hasIncludeKeywords = includeKeywords.length > 0;
  const hasExcludeKeywords = excludeKeywords.length > 0;
  const startsWith = advanced.startsWith;
  const endsWith = advanced.endsWith;

  return domains.filter((d) => {
    const nameLower = d.name.toLowerCase();

    if (hasQuickBrandable) {
      if (d.has_numbers) return false;
      if (d.has_hyphen) return false;
      if (d.length < 5 || d.length > 12) return false;
    }

    if (hasQuickAiDomains) {
      const matchesAi = AI_NAME_TOKENS.some((t) => nameLower.includes(t));
      if (!matchesAi) return false;
    }

    if (hasQuickNoNumbers) {
      if (d.has_numbers) return false;
    }

    if (hasQuickNoHyphens) {
      if (d.has_hyphen) return false;
    }

    if (hasQuickShort) {
      if (d.length > 5) return false;
    }

    if (advanced.tlds.length > 0 && !advanced.tlds.includes(d.tld)) return false;

    if (advanced.lengthMin !== undefined && d.length < advanced.lengthMin)
      return false;
    if (advanced.lengthMax !== undefined && d.length > advanced.lengthMax)
      return false;

    switch (advanced.numbersOption) {
      case "any":
        break;
      case "no_numbers":
        if (d.has_numbers) return false;
        break;
      case "only_numbers":
        if (!d.is_number_only) return false;
        break;
      case "contains_numbers":
        if (!d.has_numbers || d.is_number_only) return false;
        break;
      default:
        return false;
    }

    if (advanced.hyphenOption !== undefined) {
      if (advanced.hyphenOption === "include") {
        if (!d.has_hyphen) return false;
      } else {
        if (d.has_hyphen) return false;
      }
    }

    if (hasIncludeKeywords) {
      const matchesAny = includeKeywords.some((kw) => nameLower.includes(kw));
      if (!matchesAny) return false;
    }

    if (hasExcludeKeywords) {
      const matchesAnyExcluded = excludeKeywords.some((kw) =>
        nameLower.includes(kw)
      );
      if (matchesAnyExcluded) return false;
    }

    if (startsWith && !nameLower.startsWith(startsWith)) return false;
    if (endsWith && !nameLower.endsWith(endsWith)) return false;

    return true;
  });
}

export function sortDomains(domains: Domain[], sortBy: SortBy): Domain[] {
  const copy = [...domains];

  copy.sort((a, b) => {
    if (sortBy === "length") {
      const lengthDiff = a.length - b.length;
      if (lengthDiff !== 0) return lengthDiff;
      return a.domain.localeCompare(b.domain);
    }

    return a.domain.localeCompare(b.domain);
  });

  return copy;
}

