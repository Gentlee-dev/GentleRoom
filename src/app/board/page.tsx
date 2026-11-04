import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, STATUSES, STATUS_STYLE, formatDate, type Category, type Status } from "@/lib/constants";

type Row = { category: Category; title: string; status: Status; created_at: string };

async function Board() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_public_board");
  const rows = (data as Row[] | null) ?? [];
  const waiting = rows.filter((r) => r.status === "open").length;

  return (
    <>
        <p className="text-sm opacity-70">
          현재 대기 {waiting}건. 비슷한 요청이 이미 있으면 중복 제출 대신 기다려 주세요. (이름·내용은 비공개)
        </p>
      <ul className="divide-y divide-black/10 rounded-lg border border-black/10 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-zinc-900">
        {rows.length === 0 && <li className="p-4 text-sm opacity-70">대기 중인 요청이 없습니다.</li>}
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-3 p-3 text-sm">
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
              {STATUSES[r.status]}
            </span>
            <span className="truncate">{r.title}</span>
            <span className="ml-auto shrink-0 text-xs opacity-60">
              {CATEGORIES[r.category]} · {formatDate(r.created_at)}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function BoardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대기 현황</h1>
      <Suspense fallback={<p className="text-sm opacity-60">불러오는 중...</p>}>
        <Board />
      </Suspense>
    </div>
  );
}
