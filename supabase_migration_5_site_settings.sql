-- Run this AFTER supabase_migration_4_care_content.sql, in the Supabase SQL Editor
-- (Project > SQL Editor > New query > paste > Run).
--
-- 사이트 공통 설정 저장용 테이블. 현재는 원장 약력(key = 'career')에 사용하며,
-- 메인(index.html)과 원장소개(about.html)의 약력 목록이 이 한 곳의 데이터를
-- 함께 읽습니다. 관리자 모드에서 약력을 수정하면 두 페이지에 동시에 반영됩니다.
--
-- value 형식 (key = 'career'):
--   [{"label": "전", "text": "구리시 정경진한의원 부원장"}, ...]

create table if not exists site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table site_settings enable row level security;

create policy "anyone can read site_settings"
  on site_settings for select
  using (true);

create policy "authenticated can insert site_settings"
  on site_settings for insert
  to authenticated
  with check (true);

create policy "authenticated can update site_settings"
  on site_settings for update
  to authenticated
  using (true);
