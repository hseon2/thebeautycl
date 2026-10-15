-- Run this AFTER supabase_migration_2_rich_notices.sql, in the Supabase SQL Editor.
-- Adds a "pinned" flag so the admin can pin up to 3 notices to the top
-- of the list, regardless of date.

alter table notices add column if not exists pinned boolean not null default false;
