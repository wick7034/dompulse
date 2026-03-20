import path from "node:path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load `local.env` for server-only code (ingest + API routes).
// Next.js does not auto-load `local.env` by default.
dotenv.config({
  path: path.join(process.cwd(), "local.env"),
  override: true,
});

function cleanEnvValue(value: string | undefined): string {
  return (value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/^\u200B/, "")
    .trim();
}

let cachedClient:
  | ReturnType<typeof createClient>
  | undefined;

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  const supabaseUrl = cleanEnvValue(process.env.SUPABASE_URL);
  const serviceRoleKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    // This will surface at API runtime, not during Next.js build.
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in local.env."
    );
  }

  if (!/^https?:\/\//.test(supabaseUrl)) {
    throw new Error(
      "SUPABASE_URL must start with http:// or https://. Check local.env."
    );
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}

