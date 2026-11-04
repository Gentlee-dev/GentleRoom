"use client";

import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { submitRequest, type SubmitState } from "./actions";
import { CATEGORIES, URGENCIES } from "@/lib/constants";

const PROFILE_KEY = "gentleroom:profile";
const CODES_KEY = "gentleroom:codes";
const EMPTY = '{"student_name":"","cohort":"","join_code":""}';

function readProfile() {
  try {
    return localStorage.getItem(PROFILE_KEY) ?? EMPTY;
  } catch {
    return EMPTY;
  }
}
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("gentleroom:profile", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("gentleroom:profile", cb);
  };
}

export function RequestForm() {
  const [state, action, pending] = useActionState<SubmitState, FormData>(submitRequest, null);
  const [formKey, setFormKey] = useState(0);
  // 이름/기수/입장코드는 브라우저에 기억해 두고 다음에 자동 입력
  const profileRaw = useSyncExternalStore(subscribe, readProfile, () => EMPTY);
  let profile = { student_name: "", cohort: "", join_code: "" };
  try {
    profile = { ...profile, ...JSON.parse(profileRaw) };
  } catch {}

  useEffect(() => {
    if (state?.ok) {
      try {
        const codes: string[] = JSON.parse(localStorage.getItem(CODES_KEY) ?? "[]");
        localStorage.setItem(CODES_KEY, JSON.stringify([state.code, ...codes].slice(0, 20)));
      } catch {}
    }
  }, [state]);

  if (state?.ok) {
    return (
      <div className="card space-y-4 text-center">
        <p className="text-lg font-semibold">요청이 접수되었습니다 ✅</p>
        <p className="text-sm opacity-70">아래 티켓 코드로 처리 상태와 답변을 확인할 수 있어요.</p>
        <p className="font-mono text-3xl tracking-widest">{state.code}</p>
        <div className="flex justify-center gap-2">
          <Link className="btn" href={`/status?code=${state.code}`}>
            상태 확인하기
          </Link>
          <button className="btn-ghost" onClick={() => setFormKey((k) => k + 1)}>
            새 요청 작성
          </button>
        </div>
      </div>
    );
  }

  const v = state && !state.ok ? state.values : undefined;

  return (
    <form
      key={formKey}
      action={(fd) => {
        const p = {
          student_name: String(fd.get("student_name") ?? ""),
          cohort: String(fd.get("cohort") ?? ""),
          join_code: String(fd.get("join_code") ?? ""),
        };
        try {
          localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
          window.dispatchEvent(new Event("gentleroom:profile"));
        } catch {}
        return action(fd);
      }}
      className="card space-y-4"
    >
      {state && !state.ok && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="student_name">이름 *</label>
          <input id="student_name" name="student_name" className="field" maxLength={40} required
            defaultValue={v?.student_name ?? profile.student_name} key={`n-${profile.student_name}`} />
        </div>
        <div>
          <label className="label" htmlFor="cohort">반 / 기수</label>
          <input id="cohort" name="cohort" className="field" maxLength={40} placeholder="예: 백엔드 3기"
            defaultValue={v?.cohort ?? profile.cohort} key={`c-${profile.cohort}`} />
        </div>
        <div>
          <label className="label" htmlFor="join_code">입장 코드</label>
          <input id="join_code" name="join_code" className="field" maxLength={40} placeholder="안내받은 경우만"
            defaultValue={v?.join_code ?? profile.join_code} key={`j-${profile.join_code}`} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">카테고리 *</label>
          <select id="category" name="category" className="field" defaultValue={v?.category ?? "question"}>
            {Object.entries(CATEGORIES).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="urgency">긴급도 *</label>
          <select id="urgency" name="urgency" className="field" defaultValue={v?.urgency ?? "normal"}>
            {Object.entries(URGENCIES).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="title">제목 *</label>
        <input id="title" name="title" className="field" maxLength={120} required
          placeholder="예: npm install 시 EACCES 권한 오류" defaultValue={v?.title} />
      </div>

      <div>
        <label className="label" htmlFor="content">내용 *</label>
        <textarea id="content" name="content" className="field min-h-48" maxLength={5000} required
          defaultValue={v?.content}
          placeholder={"1. 무엇을 하려고 했나요?\n2. 어떤 문제가 발생했나요? (에러 메시지 전체 복사)\n3. 지금까지 시도해 본 방법은?"} />
      </div>

      <div>
        <label className="label" htmlFor="link">관련 링크 (GitHub, 스크린샷 등)</label>
        <input id="link" name="link" type="url" className="field" maxLength={500}
          placeholder="https://" defaultValue={v?.link} />
      </div>

      <button className="btn w-full" disabled={pending}>
        {pending ? "제출 중..." : "요청 제출"}
      </button>
    </form>
  );
}
