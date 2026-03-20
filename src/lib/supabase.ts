import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Create a singleton client that can be reused across the app.
// Note: if env vars are missing, we create a "safe" dummy client to avoid
// breaking build time; any actual DB calls will fail fast at runtime.
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : createClient("https://invalid.supabase.co", "invalid-anon-key");

