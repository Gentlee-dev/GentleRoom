# GentleRoom

부트캠프 교육생 **요청사항 접수 웹서비스**. 교육생은 로그인 없이 요청을 작성하고, 보조강사는 관리자 화면에서 긴급도·접수순으로 처리하고 답변합니다.

- 스택: Next.js 16 (App Router) + Supabase (Postgres, Auth) + Vercel
- 요금: Supabase Free + Vercel Hobby 범위 내에서 동작하도록 설계 (아래 **무료 플랜 주의사항** 꼭 확인)

## 기능

| 화면 | 대상 | 설명 |
|---|---|---|
| `/` 요청하기 | 교육생 | 이름·반·카테고리·긴급도·제목·내용·링크 입력 → **8자리 티켓 코드** 발급. 이름/반은 브라우저에 기억 |
| `/status` 내 요청 조회 | 교육생 | 티켓 코드로 상태·대기 순번·보조강사 답변 확인. 같은 브라우저에서 낸 코드는 자동 목록 표시 |
| `/board` 대기 현황 | 교육생 | 대기/처리중 요청의 **제목·카테고리만** 공개 (이름·내용 비공개) → 중복 질문 감소 |
| `/admin` 요청 관리 | 보조강사 | 상태/카테고리 필터, 긴급도→접수순 정렬, 답변 작성, 상태 변경, 삭제, 반 입장 코드 설정 |

### 보안 설계
- 교육생(anon)은 `requests` 테이블에 **직접 접근 불가**. `submit_request` / `get_request` / `list_public_board` 3개 RPC만 호출 가능
- 관리자는 Supabase Auth 로그인 + `admins` 테이블 등록 계정만 RLS로 조회/수정 허용
- 선택: **반 입장 코드**를 설정하면 링크가 외부로 퍼져도 코드를 아는 사람만 제출 가능
- 간단한 도배 방지: 같은 이름으로 1분에 3건 초과 제출 차단

## 설치 & 배포 (약 15분)

### 1. Supabase
1. https://supabase.com 에서 새 프로젝트 생성 (Free 플랜)
2. **SQL Editor** → `supabase/schema.sql` 내용 전체 붙여넣고 **Run**
3. **Authentication → Users → Add user** 로 보조강사 계정(이메일/비밀번호) 생성
4. SQL Editor 에서 관리자 등록:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = '본인이메일@example.com';
   ```
5. (권장) **Authentication → Sign In / Providers** 에서 신규 가입(Allow new users to sign up)을 끔 — 관리자 계정은 위 3번처럼 직접 추가
6. **Project Settings → API Keys / Data API** 에서 `Project URL` 과 `Publishable key`(또는 기존 `anon` key) 확인

### 2. 로컬 실행
```bash
cp .env.example .env.local   # 값 채우기
npm install
npm run dev                  # http://localhost:3000
```

### 3. Vercel
1. https://vercel.com → **Add New → Project** → 이 GitHub 저장소 Import
2. **Environment Variables** 에 추가
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (또는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. Deploy → 발급된 `https://xxx.vercel.app` 주소를 교육생에게 공유

> 두 키는 브라우저 공개용 키입니다. **`service_role` / secret key 는 절대 넣지 마세요.** 이 앱은 필요로 하지 않습니다.

## 무료 플랜 주의사항 (2026-11 기준, 출처 링크 확인 권장)

- **Supabase Free**: DB 500MB, 활성 프로젝트 2개, **1주일간 활동이 없으면 프로젝트 일시정지**(대시보드에서 복구 가능). 방학/휴강 기간 후에는 대시보드에서 Resume 필요할 수 있음.
  출처: https://supabase.com/pricing , https://supabase.com/docs/guides/platform/free-project-pausing
- **Vercel Hobby**: 무료지만 약관상 **"개인적·비상업적 용도"로 제한**됩니다. 회사(부트캠프 운영사) 업무용 배포가 이에 해당하는지는 Vercel 약관/운영사와 확인이 필요합니다.
  출처: https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage , https://vercel.com/legal/terms
- 텍스트 요청 1건은 수 KB 수준이라 500MB 한도에 걸릴 가능성은 낮지만, 주기적으로 완료 건을 삭제하면 더 안전합니다.

## 디렉토리
```
supabase/schema.sql        DB 스키마, RLS, RPC
src/app/page.tsx           요청 작성
src/app/status/            티켓 조회
src/app/board/             공개 대기 현황
src/app/admin/             관리자 (로그인, 목록, 서버 액션)
src/lib/supabase/          Supabase 클라이언트
src/proxy.ts               /admin 세션 갱신 & 비로그인 리다이렉트
```
