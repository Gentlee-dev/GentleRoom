export const CATEGORIES = {
  question: "수업 내용 질문",
  environment: "개발환경 / 설치 오류",
  assignment: "과제 / 프로젝트",
  attendance: "출결 / 행정",
  etc: "기타",
} as const;

export const URGENCIES = {
  low: "여유 있음",
  normal: "보통",
  high: "급함 (수업 진행 불가)",
} as const;

export const STATUSES = {
  open: "대기중",
  in_progress: "처리중",
  done: "완료",
  rejected: "반려",
} as const;

export type Category = keyof typeof CATEGORIES;
export type Urgency = keyof typeof URGENCIES;
export type Status = keyof typeof STATUSES;

export const STATUS_STYLE: Record<Status, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  in_progress: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  rejected: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
