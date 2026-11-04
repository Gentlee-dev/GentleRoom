"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "gentleroom:codes";

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export function RecentCodes() {
  const raw = useSyncExternalStore(
    (cb) => {
      window.addEventListener("storage", cb);
      return () => window.removeEventListener("storage", cb);
    },
    read,
    () => "[]",
  );
  let codes: string[] = [];
  try {
    codes = JSON.parse(raw);
  } catch {}
  if (codes.length === 0) return null;
  return (
    <div className="text-sm">
      <p className="mb-2 opacity-70">이 브라우저에서 제출한 요청</p>
      <div className="flex flex-wrap gap-2">
        {codes.map((c) => (
          <Link key={c} href={`/status?code=${c}`} className="btn-ghost font-mono">
            {c}
          </Link>
        ))}
      </div>
    </div>
  );
}
