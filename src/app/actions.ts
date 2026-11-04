"use server";

import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, URGENCIES } from "@/lib/constants";

export type SubmitState =
  | { ok: true; code: string }
  | { ok: false; error: string; values?: Record<string, string> }
  | null;

const ERRORS: Record<string, string> = {
  INVALID_JOIN_CODE: "반 입장 코드가 올바르지 않습니다. 보조강사에게 코드를 확인하세요.",
  TOO_MANY_REQUESTS: "짧은 시간에 너무 많이 제출했습니다. 1분 후 다시 시도하세요.",
};

export async function submitRequest(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const values = Object.fromEntries(
    ["student_name", "cohort", "category", "urgency", "title", "content", "link", "join_code"].map(
      (k) => [k, String(formData.get(k) ?? "").trim()],
    ),
  );

  if (!values.student_name || !values.title || !values.content) {
    return { ok: false, error: "이름, 제목, 내용은 필수입니다.", values };
  }
  if (!(values.category in CATEGORIES) || !(values.urgency in URGENCIES)) {
    return { ok: false, error: "카테고리/긴급도를 선택하세요.", values };
  }
  if (values.link && !/^https?:\/\//i.test(values.link)) {
    return { ok: false, error: "링크는 http:// 또는 https:// 로 시작해야 합니다.", values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_request", {
    p_student_name: values.student_name,
    p_cohort: values.cohort,
    p_category: values.category,
    p_urgency: values.urgency,
    p_title: values.title,
    p_content: values.content,
    p_link: values.link,
    p_join_code: values.join_code,
  });

  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k));
    return {
      ok: false,
      error: key ? ERRORS[key] : "제출에 실패했습니다. 입력 길이를 확인하거나 잠시 후 다시 시도하세요.",
      values,
    };
  }
  return { ok: true, code: data as string };
}
