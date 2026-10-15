-- Run this AFTER supabase_migration_3_pinned.sql, in the Supabase SQL Editor.
-- Lets the admin write 진료과목 상세페이지 본문 freely (rich text, like
-- notices) instead of being limited to a single paragraph + plain bullet
-- list. The old intro/body/points columns are kept for backward
-- compatibility but are no longer written to by the admin composer.

alter table care_content add column if not exists content text;
