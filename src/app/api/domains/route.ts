import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  const createdAt =
    url.searchParams.get("created_at") ?? todayDateString();

  const supabaseAdmin = getSupabaseAdmin();

  const limit = limitRaw ? Number(limitRaw) : undefined;
  const offset = offsetRaw ? Number(offsetRaw) : undefined;

  const safeLimit =
    limit !== undefined && Number.isFinite(limit) ? Math.max(0, limit) : 1000;
  const safeOffset =
    offset !== undefined && Number.isFinite(offset) ? Math.max(0, offset) : 0;

  const { data, error } = await supabaseAdmin
    .from("domains")
    .select(
      "domain,name,tld,length,has_numbers,is_number_only,has_hyphen,registrar,created_at"
    )
    .eq("created_at", createdAt)
    .order("domain", { ascending: true })
    .range(safeOffset, safeOffset + safeLimit - 1);

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  // Supabase `date` columns typically come back as `YYYY-MM-DD` strings.
  return NextResponse.json({ domains: data ?? [] });
}

