"use client";

export default function Header() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm">
            <span className="text-sm font-semibold text-indigo-700">DP</span>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              DomPulse
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Explore domains registered yesterday. Fast filtering, light UI.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center">
        <span className="hidden rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 sm:inline">
          Supabase-ready structure
        </span>
      </div>
    </div>
  );
}

