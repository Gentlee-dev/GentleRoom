import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, STATUSES, STATUS_STYLE, URGENCIES, formatDate, type Category, type Status, type Urgency } from "@/lib/constants";
import { RecentCodes } from "./recent-codes";

type Row = {
  ticket_code: string; student_name: string; category: Category; urgency: Urgency; title: string;
  content: string; link: string | null; status: Status; reply: string | null;
  created_at: string; updated_at: string; queue_position: number | null;
};

export default function StatusPage({ searchParams }: PageProps<"/status">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">내 요청 조회</h1>
      <Suspense fallback={<p className="text-sm opacity-60">불러오는 중...</p>}>
        <StatusContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function StatusContent({ searchParams }: { searchParams: PageProps<"/status">["searchParams"] }) {
  const { code: raw } = await searchParams;
  const code = typeof raw === "string" ? raw.trim().toUpperCase() : "";

  let row: Row | null = null;
  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_request", { p_code: code });
    row = (data as Row[] | null)?.[0] ?? null;
  }

  return (
    <>
      <form className="flex gap-2" action="/status">
        <input name="code" defaultValue={code} placeholder="티켓 코드 8자리" maxLength={8}
          className="field font-mono uppercase tracking-widest" required />
        <button className="btn shrink-0">조회</button>
      </form>
      <RecentCodes />

      {code && !row && <p className="card text-sm">해당 코드의 요청을 찾을 수 없습니다.</p>}

      {row && (
        <article className="card space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[row.status]}`}>
              {STATUSES[row.status]}
            </span>
            <span className="opacity-70">{CATEGORIES[row.category]}</span>
            <span className="opacity-70">· {URGENCIES[row.urgency]}</span>
            <span className="ml-auto opacity-60">{formatDate(row.created_at)} 접수</span>
          </div>
          {row.queue_position != null && (
            <p className="text-sm">현재 대기 순번: <b>{row.queue_position}번째</b></p>
          )}
          <h2 className="text-lg font-semibold">{row.title}</h2>
          <p className="whitespace-pre-wrap text-sm opacity-90">{row.content}</p>
          {row.link && (
            <a href={row.link} target="_blank" rel="noreferrer" className="block break-all text-sm text-indigo-600 underline">
              {row.link}
            </a>
          )}
          <div className="rounded-md bg-black/5 p-4 dark:bg-white/5">
            <p className="mb-1 text-xs font-semibold opacity-70">보조강사 답변</p>
            <p className="whitespace-pre-wrap text-sm">{row.reply || "아직 답변이 없습니다."}</p>
          </div>
        </article>
      )}
    </>
  );
}
