import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load Supabase credentials from local.env (project root).
dotenv.config({
  path: path.join(process.cwd(), "local.env"),
  override: true,
});

type DomainInsertRow = {
  domain: string;
  name: string;
  tld: string;
  length: number;
  has_numbers: boolean;
  is_number_only: boolean;
  has_hyphen: boolean;
  registrar: string;
  created_at: string; // YYYY-MM-DD
};

type SupabaseFromResult = {
  error: unknown;
};

type SupabaseDomainsTable = {
  insert: (rows: DomainInsertRow[]) => Promise<SupabaseFromResult>;
  upsert: (
    rows: DomainInsertRow[],
    options: { onConflict: string }
  ) => Promise<SupabaseFromResult>;
};

type SupabaseLike = {
  from: (table: string) => SupabaseDomainsTable;
};

const REGISTRARS: Array<{ label: string; url: string }> = [
  { label: "Namecheap", url: "https://www.namecheap.com/" },
  { label: "GoDaddy", url: "https://www.godaddy.com/" },
  { label: "Dynadot", url: "https://www.dynadot.com/" },
];

function pickRegistrar(rng = Math.random): string {
  return REGISTRARS[Math.floor(rng() * REGISTRARS.length)]!.url;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function cleanEnvValue(value: string | undefined): string {
  return (value ?? "")
    .replace(/^\uFEFF/, "") // UTF-8 BOM
    .replace(/^\u200B/, "") // zero-width space
    .trim();
}

function parseDomainLine(line: string): DomainInsertRow | null {
  const raw = line.trim().toLowerCase();
  if (!raw) return null;

  // Allow users to paste URLs accidentally.
  const withoutScheme = raw.replace(/^https?:\/\//, "");
  const withoutWww = withoutScheme.replace(/^www\./, "");
  const withoutTrailingDot = withoutWww.endsWith(".")
    ? withoutWww.slice(0, -1)
    : withoutWww;

  const lastDot = withoutTrailingDot.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === withoutTrailingDot.length - 1) {
    return null;
  }

  const name = withoutTrailingDot.slice(0, lastDot);
  const tld = withoutTrailingDot.slice(lastDot);

  const has_numbers = /\d/.test(name);
  const is_number_only = /^\d+$/.test(name);
  const has_hyphen = name.includes("-");
  const length = name.length;

  return {
    domain: `${name}${tld}`,
    name,
    tld,
    length,
    has_numbers,
    is_number_only,
    has_hyphen,
    registrar: pickRegistrar(),
    created_at: todayDateString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string };
  return e.code === "23505";
}

async function insertBatch(
  supabase: SupabaseLike,
  rows: DomainInsertRow[]
) {
  if (rows.length === 0) return;

  const { error } = await supabase.from("domains").insert(rows);
  if (!error) return;

  // If the file contains duplicates, fall back to upsert for that batch.
  // This keeps the ingest operation resilient while still honoring the `insert` intent.
  if (isUniqueViolation(error)) {
    const { error: upsertError } = await supabase
      .from("domains")
      .upsert(rows, { onConflict: "domain" });
    if (upsertError) throw upsertError;
    return;
  }

  throw error;
}

async function main() {
  const fileArgIndex = process.argv.findIndex((a) => a === "--file");
  const filePath =
    fileArgIndex !== -1 && process.argv[fileArgIndex + 1]
      ? process.argv[fileArgIndex + 1]!
      : path.join(process.cwd(), "data", "domains.txt");

  const supabaseUrl = cleanEnvValue(process.env.SUPABASE_URL);
  const serviceRoleKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in your environment before running."
    );
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file not found: ${filePath}`);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  }) as unknown as SupabaseLike;

  const BATCH_SIZE = 1000;
  const input = fs.createReadStream(filePath, { encoding: "utf8" });
  const rl = readline.createInterface({ input, crlfDelay: Infinity });

  let batch: DomainInsertRow[] = [];
  let totalLines = 0;
  let parsedRows = 0;
  let skippedRows = 0;
  let insertedRows = 0;

  for await (const line of rl) {
    totalLines += 1;
    const row = parseDomainLine(line);
    if (!row) {
      skippedRows += 1;
      continue;
    }

    batch.push(row);
    parsedRows += 1;

    if (batch.length >= BATCH_SIZE) {
      const rowsToInsert = batch;
      batch = [];
      await insertBatch(supabase, rowsToInsert);
      insertedRows += rowsToInsert.length;
      console.log(`Inserted ${insertedRows} / ${parsedRows} rows...`);
    }
  }

  if (batch.length > 0) {
    const rowsToInsert = batch;
    await insertBatch(supabase, rowsToInsert);
    insertedRows += rowsToInsert.length;
  }

  console.log(
    JSON.stringify(
      {
        file: filePath,
        totalLines,
        parsedRows,
        skippedRows,
        insertedRows,
        created_at: todayDateString(),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

