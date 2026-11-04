import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/supabase/server";
import {
  CATEGORIES, STATUSES, STATUS_STYLE, URGENCIES, formatDate,
  type Category, type Status, type Urgency,
} from "@/lib/constants";
import { deleteRequest, signOut, updateJoinCode, updateRequest } from "./actions";

type Row = {
  id: string; ticket_code: string; student_name: string; cohort: string | null;
  category: Category; urgency: Urgency; title: string; content: string; link: string | null;
  status: Status; reply: string | null; created_at: string; updated_at: string;
};

const URGENCY_ORDER: Record<Urgency, number> = { high: 0, normal: 1, low: 2 };
const FILTERS = ["active", "open", "in_progress", "done", "rejected", "all"] as const;
const FILTER_LABEL: Record<(typeof FILTERS)[number], string> = {
  active: "미완료", open: "대기중", in_progress: "처리중", done: "완료", rejected: "반려", all: "전체",
};

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<p className="text-sm opacity-60">불러오는 중...</p>}>
      <AdminContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminContent({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const { supabase, user, isAdmin } = await getAdmin();
  if (!user) redirect("/admin/login");

  if (!isAdmin) {
    return (
      <div className="card space-y-3 text-sm">
        <p className="font-semibold">관리자로 등록되지 않은 계정입니다.</p>
        <p>Supabase SQL Editor 에서 아래 SQL 을 실행한 뒤 새로고침하세요.</p>
        <pre className="overflow-x-auto rounded bg-black/5 p-3 dark:bg-white/5">
          insert into public.admins (user_id) values (&apos;{user.id}&apos;);
        </pre>
        <form action={signOut}><button className="btn-ghost">로그아웃</button></form>
      </div>
    );
  }

  const sp = await searchParams;
  const filter = (FILTERS as readonly string[]).includes(String(sp.f)) ? (sp.f as (typeof FILTERS)[number]) : "active";
  const category = typeof sp.c === "string" && sp.c in CATEGORIES ? sp.c : "";

  let query = supabase.from("requests").select("*").order("created_at", { ascending: true }).limit(500);
  if (filter === "active") query = query.in("status", ["open", "in_progress"]);
  else if (filter !== "all") query = query.eq("status", filter);
  if (category) query = query.eq("category", category);

  const [{ data }, { data: setting }] = await Promise.all([
    query,
    supabase.from("app_settings").select("value").eq("key", "join_code").maybeSingle(),
  ]);
  const rows = ((data as Row[] | null) ?? []).sort((a, b) =>
    filter === "done" || filter === "all"
      ? b.created_at.localeCompare(a.created_at)
      : URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || a.created_at.localeCompare(b.created_at),
  );

  const href = (f: string, c: string) => `/admin?f=${f}${c ? `&c=${c}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">요청 관리</h1>
        <span className="text-sm opacity-60">{user.email}</span>
        <Link href={href(filter, category)} className="btn-ghost ml-auto">새로고침</Link>
        <form action={signOut}><button className="btn-ghost">로그아웃</button></form>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link key={f} href={href(f, category)}
            className={`rounded-full px-3 py-1 ${f === filter ? "bg-indigo-600 text-white" : "bg-black/5 dark:bg-white/10"}`}>
            {FILTER_LABEL[f]}
          </Link>
        ))}
        <span className="mx-1 opacity-30">|</span>
        <Link href={href(filter, "")}
          className={`rounded-full px-3 py-1 ${!category ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black" : "bg-black/5 dark:bg-white/10"}`}>
          전체 분류
        </Link>
        {Object.entries(CATEGORIES).map(([k, label]) => (
          <Link key={k} href={href(filter, k)}
            className={`rounded-full px-3 py-1 ${k === category ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black" : "bg-black/5 dark:bg-white/10"}`}>
            {label}
          </Link>
        ))}
      </div>

      <p className="text-sm opacity-70">{rows.length}건 · 미완료 목록은 긴급도 → 접수순으로 정렬됩니다.</p>

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id}>
            <details className="card group" open={r.urgency === "high" && r.status === "open"}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                  {STATUSES[r.status]}
                </span>
                {r.urgency === "high" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-200">급함</span>}
                <span className="font-medium">{r.title}</span>
                <span className="ml-auto text-xs opacity-60">
                  {r.student_name}{r.cohort ? ` (${r.cohort})` : ""} · {CATEGORIES[r.category]} · {formatDate(r.created_at)}
                </span>
              </summary>

              <div className="mt-4 space-y-3 border-t border-black/10 pt-4 dark:border-white/10">
                <p className="text-xs opacity-60">
                  티켓 <span className="font-mono">{r.ticket_code}</span> · 긴급도 {URGENCIES[r.urgency]}
                </p>
                <p className="whitespace-pre-wrap text-sm">{r.content}</p>
                {r.link && (
                  <a href={r.link} target="_blank" rel="noreferrer" className="block break-all text-sm text-indigo-600 underline">{r.link}</a>
                )}
                <form action={updateRequest} className="space-y-2">
                  <input type="hidden" name="id" value={r.id} />
                  <textarea name="reply" defaultValue={r.reply ?? ""} className="field min-h-24"
                    placeholder="교육생에게 보여질 답변 (선택)" maxLength={5000} />
                  <div className="flex flex-wrap items-center gap-2">
                    <select name="status" defaultValue={r.status} className="field w-auto">
                      {Object.entries(STATUSES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                    </select>
                    <button className="btn">저장</button>
                  </div>
                </form>
                <form action={deleteRequest}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs text-red-600 underline opacity-70 hover:opacity-100">삭제</button>
                </form>
              </div>
            </details>
          </li>
        ))}
        {rows.length === 0 && <li className="card text-sm opacity-70">해당 조건의 요청이 없습니다.</li>}
      </ul>

      <details className="card text-sm">
        <summary className="cursor-pointer font-medium">설정 · 반 입장 코드</summary>
        <form action={updateJoinCode} className="mt-3 flex gap-2">
          <input name="join_code" defaultValue={setting?.value ?? ""} className="field"
            placeholder="비워두면 누구나 제출 가능" maxLength={40} />
          <button className="btn shrink-0">저장</button>
        </form>
        <p className="mt-2 text-xs opacity-60">
          코드를 설정하면 링크가 외부로 퍼져도 코드를 아는 교육생만 제출할 수 있습니다.
        </p>
      </details>
    </div>
  );
}
