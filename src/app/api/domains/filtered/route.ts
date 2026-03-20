import { NextResponse } from "next/server";
import { getFilteredDomains, type DomainQueryFilters } from "@/lib/getFilteredDomains";

function parseCsv(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

function parseOptionalNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const filters: DomainQueryFilters = {
    tlds: parseCsv(url.searchParams.get("tlds")),
    noNumbers: url.searchParams.get("no_numbers") === "1",
    noHyphens: url.searchParams.get("no_hyphens") === "1",
    lengthMin: parseOptionalNumber(url.searchParams.get("length_min")),
    lengthMax: parseOptionalNumber(url.searchParams.get("length_max")),
  };

  const domains = await getFilteredDomains(filters);
  return NextResponse.json({ domains });
}

