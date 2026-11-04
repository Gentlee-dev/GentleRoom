"use client";

import { useActionState } from "react";
import { signIn } from "../actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="card mx-auto max-w-sm space-y-4">
      <h1 className="text-xl font-bold">관리자 로그인</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label className="label" htmlFor="email">이메일</label>
        <input id="email" name="email" type="email" className="field" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">비밀번호</label>
        <input id="password" name="password" type="password" className="field" required autoComplete="current-password" />
      </div>
      <button className="btn w-full" disabled={pending}>{pending ? "로그인 중..." : "로그인"}</button>
    </form>
  );
}
