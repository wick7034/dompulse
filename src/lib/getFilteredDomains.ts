import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { Domain } from "@/types/domain";

const SELECT_FIELDS =
  "domain,name,tld,length,has_numbers,is_number_only,has_hyphen,registrar,created_at";

export type DomainQueryFilters = {
  tlds?: string[];
  noNumbers?: boolean;
  noHyphens?: boolean;
  lengthMin?: number;
  lengthMax?: number;
  startsWith?: string;
  endsWith?: string;
};

export async function getFilteredDomains(
  filters: DomainQueryFilters
): Promise<Domain[]> {
  const supabaseAdmin = getSupabaseAdmin();

  let query = supabaseAdmin
    .from("domains")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.tlds && filters.tlds.length > 0) {
    query = query.in("tld", filters.tlds);
  }

  if (filters.noNumbers) {
    query = query.eq("has_numbers", false);
  }

  if (filters.noHyphens) {
    query = query.eq("has_hyphen", false);
  }

  if (filters.lengthMin !== undefined) {
    query = query.gte("length", filters.lengthMin);
  }

  if (filters.lengthMax !== undefined) {
    query = query.lte("length", filters.lengthMax);
  }

  if (filters.startsWith) {
    query = query.ilike("name", `${filters.startsWith}%`);
  }

  if (filters.endsWith) {
    query = query.ilike("name", `%${filters.endsWith}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch filtered domains: ${error.message}`);

  return (data ?? []) as Domain[];
}

