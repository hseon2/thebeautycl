-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- for the 화곡 더아름다운한의원 site's admin login + content management feature.

-- ─────────────────────────────────────────────
-- 공지사항 (notices shown on index.html #notice)
-- ─────────────────────────────────────────────
create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  tag text not null default '안내',
  content text not null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table notices enable row level security;

create policy "anyone can read published notices"
  on notices for select
  using (published = true);

create policy "authenticated can read all notices"
  on notices for select
  to authenticated
  using (true);

create policy "authenticated can insert notices"
  on notices for insert
  to authenticated
  with check (true);

create policy "authenticated can update notices"
  on notices for update
  to authenticated
  using (true);

create policy "authenticated can delete notices"
  on notices for delete
  to authenticated
  using (true);

-- ─────────────────────────────────────────────
-- 진료과목 상세페이지 커스텀 콘텐츠
-- (care-01~06, care-general, care-special)
-- ─────────────────────────────────────────────
create table if not exists care_content (
  slug text primary key,
  intro text,
  body text,
  points jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table care_content enable row level security;

create policy "anyone can read care_content"
  on care_content for select
  using (true);

create policy "authenticated can upsert care_content"
  on care_content for insert
  to authenticated
  with check (true);

create policy "authenticated can update care_content"
  on care_content for update
  to authenticated
  using (true);

-- ─────────────────────────────────────────────
-- Admin user: create this in Supabase Dashboard, NOT via SQL.
-- Go to Authentication > Users > Add user, create one email/password
-- login for the clinic admin. Anyone who signs in with that account
-- is treated as the site admin (there is no public self-signup form
-- anywhere on the site, so this is the only way to get a session).
-- ─────────────────────────────────────────────
