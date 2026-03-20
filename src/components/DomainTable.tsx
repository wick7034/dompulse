"use client";

import { useEffect, useRef, useState } from "react";
import type { Domain } from "@/types/domain";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function registrarLabel(urlOrLabel: string): string {
  try {
    const u = new URL(urlOrLabel);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return urlOrLabel;
  }
}

async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback for older browsers / clipboard restrictions.
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

type Props = {
  domains: Domain[];
};

export default function DomainTable({ domains }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  async function handleCopy(domain: string) {
    try {
      await copyToClipboard(domain);
      setToast("Copied");
    } catch {
      setToast("Copy failed");
    }

    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1300);
  }

  if (domains.length === 0) {
    return (
      <div className="flex items-center justify-center px-4 py-16 text-sm text-zinc-600">
        No domains match your filters
      </div>
    );
  }

  return (
    <div className="relative">
      {toast && (
        <div
          className="absolute right-4 top-3 z-20 rounded-md border border-zinc-200 bg-white px-3 py-1 text-sm font-medium text-zinc-700 shadow-sm"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      <div className="overflow-auto max-h-[64vh]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-zinc-200 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <th className="px-4 py-3">Domain Name</th>
              <th className="px-4 py-3">TLD</th>
              <th className="px-4 py-3">Length</th>
              <th className="px-4 py-3">Registrar</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {domains.map((d, idx) => (
              <tr
                key={`${d.domain}-${idx}`}
                className="group transition-colors hover:bg-zinc-50"
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleCopy(d.domain)}
                    className="font-medium text-indigo-700 transition-colors hover:text-indigo-800 hover:underline"
                    title="Click to copy"
                  >
                    {d.domain}
                  </button>
                </td>
                <td className="px-4 py-3 text-zinc-800">{d.tld}</td>
                <td className="px-4 py-3 text-zinc-800">{d.length}</td>
                <td className="px-4 py-3">
                  <a
                    href={d.registrar}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-700 transition-colors hover:text-indigo-800 hover:underline"
                  >
                    {registrarLabel(d.registrar)}
                  </a>
                </td>
                <td className="px-4 py-3 text-zinc-700">
                  {formatDate(d.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

