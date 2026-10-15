-- Run this AFTER supabase_schema.sql, in the Supabase SQL Editor.
-- Adds a title field to notices, and a storage bucket for images
-- uploaded through the rich-text notice editor.

-- 1. 공지사항 제목 컬럼 추가
alter table notices add column if not exists title text not null default '';

-- 2. 공지사항 에디터에서 업로드하는 이미지를 저장할 버킷
insert into storage.buckets (id, name, public)
values ('notice-images', 'notice-images', true)
on conflict (id) do nothing;

create policy "public read notice images"
  on storage.objects for select
  using (bucket_id = 'notice-images');

create policy "authenticated upload notice images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'notice-images');

create policy "authenticated delete notice images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'notice-images');
