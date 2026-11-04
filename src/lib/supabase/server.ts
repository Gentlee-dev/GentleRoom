import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL, assertEnv } from "./env";

export async function createClient() {
  assertEnv();
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component 에서 호출된 경우 무시 (proxy 가 세션을 갱신함)
        }
      },
    },
  });
}

/** 로그인 + admins 테이블 등록 여부 확인 */
export async function getAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { supabase, user: null, isAdmin: false } as const;
  const { data: row } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return { supabase, user, isAdmin: !!row } as const;
}
