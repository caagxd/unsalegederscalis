-- LGS Hazırlık — 002: ekran süresi, konu videoları, okul ilerlemesi
-- 001_init.sql'den sonra Supabase SQL Editor'de bir kez çalıştırın. Tekrar çalıştırmak zararsızdır.

-- Okulda her derste en son işlenen ünite: { "matematik": 3, "fen": 2, ... }
alter table families add column if not exists school_progress jsonb not null default '{}';

-- ───────────── Günlük ekran süresi ─────────────
create table if not exists screen_time (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default my_family() references families on delete cascade,
  date date not null,
  minutes int not null check (minutes between 0 and 1440),
  photo_path text, -- telefonun "Ekran Süresi" ekran görüntüsü (wrong-photos kovasında <aile>/ekran/...)
  note text,
  created_at timestamptz not null default now(),
  unique (family_id, date)
);
create index if not exists screen_time_family_date on screen_time (family_id, date);
alter table screen_time enable row level security;

drop policy if exists "aile okur" on screen_time;
drop policy if exists "öğrenci ekler" on screen_time;
drop policy if exists "öğrenci günceller" on screen_time;
drop policy if exists "öğrenci siler" on screen_time;
create policy "aile okur" on screen_time for select using (family_id = my_family());
create policy "öğrenci ekler" on screen_time for insert with check (family_id = my_family() and my_role() = 'student');
create policy "öğrenci günceller" on screen_time for update using (family_id = my_family() and my_role() = 'student');
create policy "öğrenci siler" on screen_time for delete using (family_id = my_family() and my_role() = 'student');

-- ───────────── Konu videoları (aile ekler) ─────────────
create table if not exists topic_videos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default my_family() references families on delete cascade,
  topic_id text not null,
  youtube_id text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  title text,
  added_by uuid not null default auth.uid() references profiles on delete cascade,
  created_at timestamptz not null default now(),
  unique (family_id, topic_id, youtube_id)
);
create index if not exists topic_videos_family_topic on topic_videos (family_id, topic_id);
alter table topic_videos enable row level security;

drop policy if exists "aile okur" on topic_videos;
drop policy if exists "aile ekler" on topic_videos;
drop policy if exists "aile siler" on topic_videos;
create policy "aile okur" on topic_videos for select using (family_id = my_family());
create policy "aile ekler" on topic_videos for insert with check (family_id = my_family() and added_by = auth.uid());
create policy "aile siler" on topic_videos for delete using (family_id = my_family());
