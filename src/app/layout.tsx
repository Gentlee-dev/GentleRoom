import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "GentleRoom · 요청 접수함",
  description: "부트캠프 교육생 요청사항 접수 및 처리 현황",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/10">
          <nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 text-sm">
            <Link href="/" className="font-semibold text-base">
              GentleRoom
            </Link>
            <Link href="/" className="opacity-70 hover:opacity-100">
              요청하기
            </Link>
            <Link href="/status" className="opacity-70 hover:opacity-100">
              내 요청 조회
            </Link>
            <Link href="/board" className="opacity-70 hover:opacity-100">
              대기 현황
            </Link>
            <Link href="/admin" className="ml-auto opacity-50 hover:opacity-100">
              관리자
            </Link>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
