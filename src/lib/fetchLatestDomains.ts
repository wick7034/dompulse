import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { Domain } from "@/types/domain";

const SELECT_FIELDS =
  "domain,name,tld,length,has_numbers,is_number_only,has_hyphen,registrar,created_at";

export async function fetchLatestDomains(limit = 500): Promise<Domain[]> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("domains")
    .select(SELECT_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch domains: ${error.message}`);
  }

  return (data ?? []) as Domain[];
}

