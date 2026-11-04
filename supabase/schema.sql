-- GentleRoom 스키마
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run 하세요. (여러 번 실행해도 안전)
--
-- 보안 모델
--   * 교육생(로그인 없음, anon): 테이블에 직접 접근 불가. 아래 RPC 3개만 호출 가능
--       - submit_request : 요청 작성 → 조회용 티켓 코드 반환
--       - get_request    : 티켓 코드로 내 요청 상태/답변 조회
--       - list_public_board : 공개 대기열(제목·카테고리·상태만, 이름/내용 제외)
--   * 보조강사(관리자): Supabase Auth 로그인 + admins 테이블에 등록된 계정만 조회/수정 가능

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------
-- 테이블
-- ---------------------------------------------------------------
create table if not exists public.requests (
  id           uuid primary key default gen_random_uuid(),
  ticket_code  text not null unique,
  student_name text not null check (char_length(student_name) between 1 and 40),
  cohort       text check (char_length(cohort) <= 40),
  category     text not null check (category in ('question','environment','assignment','attendance','etc')),
  urgency      text not null default 'normal' check (urgency in ('low','normal','high')),
  title        text not null check (char_length(title) between 1 and 120),
  content      text not null check (char_length(content) between 1 and 5000),
  link         text check (char_length(link) <= 500),
  status       text not null default 'open' check (status in ('open','in_progress','done','rejected')),
  reply        text check (char_length(reply) <= 5000),
  handled_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists requests_status_created_idx on public.requests (status, created_at desc);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 반 입장 코드 (선택). value 가 비어있으면 코드 없이 제출 가능
create table if not exists public.app_settings (
  key   text primary key,
  value text
);
insert into public.app_settings (key, value) values ('join_code', null)
  on conflict (key) do nothing;

-- ---------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------
alter table public.requests     enable row level security;
alter table public.admins       enable row level security;
alter table public.app_settings enable row level security;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

drop policy if exists "admins read requests"   on public.requests;
drop policy if exists "admins update requests" on public.requests;
drop policy if exists "admins delete requests" on public.requests;
drop policy if exists "admins read self"       on public.admins;
drop policy if exists "admins read settings"   on public.app_settings;
drop policy if exists "admins update settings" on public.app_settings;

create policy "admins read requests"   on public.requests for select to authenticated using (public.is_admin());
create policy "admins update requests" on public.requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete requests" on public.requests for delete to authenticated using (public.is_admin());
create policy "admins read self"       on public.admins   for select to authenticated using (user_id = auth.uid());
create policy "admins read settings"   on public.app_settings for select to authenticated using (public.is_admin());
create policy "admins update settings" on public.app_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists requests_touch on public.requests;
create trigger requests_touch before update on public.requests
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------
-- 교육생용 RPC
-- ---------------------------------------------------------------
create or replace function public.submit_request(
  p_student_name text,
  p_cohort       text,
  p_category     text,
  p_urgency      text,
  p_title        text,
  p_content      text,
  p_link         text,
  p_join_code    text
)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_required text;
  v_code     text;
  v_recent   int;
begin
  select value into v_required from app_settings where key = 'join_code';
  if coalesce(v_required, '') <> '' and coalesce(trim(p_join_code), '') <> v_required then
    raise exception 'INVALID_JOIN_CODE';
  end if;

  -- 간단한 도배 방지: 같은 이름으로 1분 내 3건 초과 금지
  select count(*) into v_recent from requests
   where student_name = trim(p_student_name) and created_at > now() - interval '1 minute';
  if v_recent >= 3 then
    raise exception 'TOO_MANY_REQUESTS';
  end if;

  loop
    -- 혼동되는 문자(0/O, 1/I) 제외한 8자리 코드
    v_code := (
      select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(b, i) % 32), 1), '')
        from (select gen_random_bytes(8) as b) s, generate_series(0, 7) as i
    );
    exit when not exists (select 1 from requests where ticket_code = v_code);
  end loop;

  insert into requests (ticket_code, student_name, cohort, category, urgency, title, content, link)
  values (
    v_code,
    trim(p_student_name),
    nullif(trim(p_cohort), ''),
    p_category,
    coalesce(nullif(p_urgency, ''), 'normal'),
    trim(p_title),
    trim(p_content),
    nullif(trim(p_link), '')
  );

  return v_code;
end;
$$;

create or replace function public.get_request(p_code text)
returns table (
  ticket_code text, student_name text, category text, urgency text, title text,
  content text, link text, status text, reply text, created_at timestamptz, updated_at timestamptz,
  queue_position bigint
)
language sql stable security definer set search_path = public
as $$
  select r.ticket_code, r.student_name, r.category, r.urgency, r.title,
         r.content, r.link, r.status, r.reply, r.created_at, r.updated_at,
         case when r.status = 'open' then
           (select count(*) from requests o where o.status = 'open' and o.created_at <= r.created_at)
         end as queue_position
    from requests r
   where r.ticket_code = upper(trim(p_code));
$$;

create or replace function public.list_public_board()
returns table (category text, title text, status text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select category, title, status, created_at
    from requests
   where status in ('open', 'in_progress')
      or (status = 'done' and updated_at > now() - interval '1 day')
   order by created_at asc
   limit 100;
$$;

-- 권한: 테이블 직접 접근은 막고 RPC 만 노출
revoke all on public.requests, public.admins, public.app_settings from anon;
revoke execute on function public.submit_request(text,text,text,text,text,text,text,text) from public;
revoke execute on function public.get_request(text) from public;
revoke execute on function public.list_public_board() from public;
grant execute on function public.submit_request(text,text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.get_request(text) to anon, authenticated;
grant execute on function public.list_public_board() to anon, authenticated;
