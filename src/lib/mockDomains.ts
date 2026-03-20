import type { Domain } from "@/types/domain";

const TLDS = [".com", ".ai", ".xyz", ".io"] as const;
const REGISTRARS = [
  { url: "https://www.namecheap.com/", label: "Namecheap" },
  { url: "https://www.godaddy.com/", label: "GoDaddy" },
  { url: "https://www.cloudflare.com/", label: "Cloudflare" },
  { url: "https://www.ovhcloud.com/", label: "OVHcloud" },
  { url: "https://www.ionos.com/", label: "IONOS" },
  { url: "https://domains.google/", label: "Google Domains" },
  { url: "https://www.dynadot.com/", label: "Dynadot" },
  { url: "https://www.hover.com/", label: "Hover" },
] as const;

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

const SYLLABLES = [
  "nova",
  "pulse",
  "lumen",
  "vertex",
  "orbit",
  "glyph",
  "signal",
  "relay",
  "vector",
  "craft",
  "forge",
  "rune",
  "grid",
  "beam",
  "link",
  "spark",
  "dash",
  "flow",
  "atlas",
  "quanta",
  "zen",
  "terra",
  "axiom",
  "zenith",
  "prism",
  "mosaic",
  "echo",
  "bloom",
  "kindle",
  "harbor",
  "kestrel",
  "cobalt",
  "fathom",
  "saffron",
] as const;

function randomAlphaName(rng: () => number, minLen: number, maxLen: number) {
  for (let attempt = 0; attempt < 40; attempt++) {
    let out = "";
    while (out.length < minLen) {
      out += pick(SYLLABLES, rng);
    }
    // Trim down to maxLen (only on last syllable).
    if (out.length > maxLen) out = out.slice(0, maxLen);
    if (out.length >= minLen && out.length <= maxLen) return out;
  }
  // Fallback: deterministic short alpha.
  return "pulsecraft".slice(0, minLen);
}

function randomDigits(rng: () => number, minLen: number, maxLen: number) {
  const len =
    minLen + Math.floor(rng() * Math.max(1, maxLen - minLen + 1));
  let out = "";
  for (let i = 0; i < len; i++) {
    out += String(Math.floor(rng() * 10));
  }
  return out;
}

function maybeMakeAiName(rng: () => number, base: string) {
  const tokens = ["ai", "gpt", "agent", "bot"] as const;
  if (rng() < 0.55) return base;
  const token = pick(tokens, rng);
  const left = rng() < 0.5 ? base : "";
  const right = rng() < 0.5 ? base : "";
  const mid = rng() < 0.5 ? token : token + base.length.toString();
  const name = `${left}${mid}${right}`.replace(/[^a-z0-9]/gi, "");
  return name || base;
}

function hasNumbers(name: string) {
  return /\d/.test(name);
}

function isNumberOnly(name: string) {
  return /^\d+$/.test(name);
}

function hasHyphen(name: string) {
  return name.includes("-");
}

function makeName(rng: () => number) {
  const template = Math.floor(rng() * 8);

  // 0-2: brandable alpha (no numbers, no hyphens) with length 5-12
  if (template <= 2) return randomAlphaName(rng, 5, 12);

  // 3: AI-ish alpha (still no numbers/hyphens most of the time)
  if (template === 3) {
    const base = randomAlphaName(rng, 4, 10);
    const withToken = maybeMakeAiName(rng, base);
    // Ensure it stays alphabetic-ish for brandable moments.
    return withToken.replace(/(\d)+/g, "").slice(0, 14) || base;
  }

  // 4: short domain letters only (<=5)
  if (template === 4) return randomAlphaName(rng, 2, 5);

  // 5: letters + digits (contains numbers)
  if (template === 5) {
    const prefix = randomAlphaName(rng, 3, 10);
    const digits = randomDigits(rng, 2, 6);
    return rng() < 0.5 ? `${prefix}${digits}` : `${digits}${prefix}`;
  }

  // 6: only digits
  if (template === 6) return randomDigits(rng, 3, 8);

  // 7: hyphenated (letters parts, mostly)
  const left = randomAlphaName(rng, 2, 7);
  const right = randomAlphaName(rng, 2, 7);
  return `${left}-${right}`;
}

function makeCreatedAt(rng: () => number) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const msInDay = 24 * 60 * 60 * 1000;
  const offset = Math.floor(rng() * msInDay);
  const createdAt = new Date(yesterday.getTime() + offset);
  return createdAt.toISOString();
}

export const MOCK_DOMAINS: Domain[] = (() => {
  const rng = mulberry32(42);
  const total = 90;
  const domains: Domain[] = [];
  const seen = new Set<string>();

  let attempts = 0;
  const maxAttempts = total * 60;
  while (domains.length < total && attempts < maxAttempts) {
    attempts += 1;
    const tld = pick(TLDS, rng);
    const name = makeName(rng).toLowerCase();
    const registrar = pick(REGISTRARS, rng);
    const created_at = makeCreatedAt(rng);
    const domain = `${name}${tld}`;

    if (seen.has(domain)) continue;
    seen.add(domain);

    domains.push({
      domain,
      name,
      tld,
      length: name.length,
      has_numbers: hasNumbers(name),
      is_number_only: isNumberOnly(name),
      has_hyphen: hasHyphen(name),
      registrar: registrar.url,
      created_at,
    });
  }

  // Ensure determinism: stable order based on created_at then domain.
  domains.sort((a, b) => {
    const diff = a.created_at.localeCompare(b.created_at);
    if (diff !== 0) return diff;
    return a.domain.localeCompare(b.domain);
  });

  return domains;
})();

