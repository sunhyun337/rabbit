-- ============================================================
-- 토끼전 말하기 연습 — 데이터 수집 스키마
-- Supabase SQL Editor에 그대로 붙여넣어 1회 실행하세요.
-- (학생 활동 로그 + 프로필/역할/연구동의 + 교사용 요약 뷰)
-- ============================================================

-- 1) 프로필 (auth.users 1:1) --------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  role text not null default 'student' check (role in ('student', 'teacher')),
  research_consent boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now()
);

-- 신규 가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) 활동 로그 (대화/퀴즈/게임 통합) --------------------------
create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  session_id uuid,                 -- 한 번의 대화/활동 묶음
  feature text not null,           -- practice | interview | chat | quiz | game
  mode text,                       -- tutor/jara/tokki/yongwang, 퀴즈셋 id, 게임 단계 등
  turn_role text,                  -- user | assistant (대화 턴)
  content text,                    -- 메시지/질문/답 텍스트
  input_method text,               -- voice | text
  scene text,                      -- 보고 있던 줄거리 장면
  meta jsonb not null default '{}'::jsonb,  -- 퀴즈: {question, choices, picked, correct, is_correct}, 게임: {event, result ...}
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_user_idx on public.activity_logs (user_id, created_at desc);
create index if not exists activity_logs_feature_idx on public.activity_logs (feature);
create index if not exists activity_logs_session_idx on public.activity_logs (session_id);

-- 3) RLS: 학생은 '본인 것'만 넣고/본다 -----------------------
--    (교사 대시보드는 서버에서 service_role로 조회하므로 별도 정책 불필요)
alter table public.profiles enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists logs_insert_own on public.activity_logs;
create policy logs_insert_own on public.activity_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists logs_select_own on public.activity_logs;
create policy logs_select_own on public.activity_logs
  for select using (auth.uid() = user_id);

-- 4) 교사용 요약 뷰 (service_role로만 조회) --------------------
create or replace view public.activity_summary as
select
  l.user_id,
  count(*)                                                                  as total_events,
  count(*) filter (where l.feature in ('practice','interview','chat')
                     and l.turn_role = 'user')                              as student_turns,
  count(*) filter (where l.feature in ('practice','interview','chat')
                     and l.turn_role = 'user' and l.input_method = 'voice') as voice_turns,
  count(*) filter (where l.feature = 'quiz')                                as quiz_answers,
  count(*) filter (where l.feature = 'quiz'
                     and (l.meta->>'is_correct')::boolean is true)          as quiz_correct,
  count(*) filter (where l.feature = 'game')                                as game_events,
  min(l.created_at)                                                         as first_active,
  max(l.created_at)                                                         as last_active
from public.activity_logs l
group by l.user_id;

-- 5) (선택) 추가 교사 계정 지정 예시 --------------------------
--    기본 교사는 앱의 TEACHER_EMAILS 환경변수로 지정됩니다.
--    DB에서 교사를 더 추가하려면 아래처럼 실행하세요:
-- update public.profiles set role = 'teacher' where email = 'teacher2@example.com';
