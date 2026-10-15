-- LGS Hazırlık — ilk şema
-- Supabase SQL Editor'de bir kez çalıştırın.

-- ───────────── Aile & profiller ─────────────
create table families (
  id uuid primary key default gen_random_uuid(),
  join_code text unique not null default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  exam_date date not null default '2027-06-13',
  weekday_minutes int not null default 90,
  weekend_minutes int not null default 180,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  family_id uuid not null references families on delete cascade,
  role text not null check (role in ('student', 'parent')),
  display_name text not null,
  created_at timestamptz not null default now()
);

create or replace function my_family() returns uuid
language sql stable security definer set search_path = public as
$$ select family_id from profiles where id = auth.uid() $$;

create or replace function my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

-- Yeni kullanıcı kaydında profil oluşturur.
-- Ebeveyn: family_code yoksa yeni aile açar, varsa o aileye katılır.
-- Öğrenci: family_code zorunlu; her ailede tek öğrenci.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', 'parent');
  v_code text := upper(nullif(new.raw_user_meta_data->>'family_code', ''));
  v_name text := coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), 'Kullanıcı');
  v_family uuid;
begin
  if v_code is not null then
    select id into v_family from families where join_code = v_code;
    if v_family is null then raise exception 'Geçersiz aile kodu'; end if;
  elsif v_role = 'parent' then
    insert into families default values returning id into v_family;
  else
    raise exception 'Öğrenci hesabı için aile kodu gerekli';
  end if;

  if v_role = 'student' and exists (select 1 from profiles where family_id = v_family and role = 'student') then
    raise exception 'Bu ailede zaten bir öğrenci hesabı var';
  end if;

  insert into profiles (id, family_id, role, display_name) values (new.id, v_family, v_role, v_name);
  return new;
end
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

-- ───────────── Öğrenci verileri ─────────────
create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default my_family() references families on delete cascade,
  date date not null default current_date,
  subject text not null,
  topic_id text,
  solved int not null default 0,
  correct int not null default 0,
  wrong int not null default 0,
  empty int not null default 0,
  minutes int not null default 0,
  source text, -- kitap/kaynak adı
  created_at timestamptz not null default now()
);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default my_family() references families on delete cascade,
  question_id text not null,
  topic_id text not null,
  subject text not null,
  chosen int not null,
  correct boolean not null,
  created_at timestamptz not null default now()
);

create table exams (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default my_family() references families on delete cascade,
  date date not null default current_date,
  name text not null,
  source text,
  results jsonb not null, -- { "turkce": {"d":15,"y":3,"b":2}, ... }
  created_at timestamptz not null default now()
);

create table wrong_bank (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default my_family() references families on delete cascade,
  photo_path text not null,
  subject text not null,
  topic_id text,
  note text,
  next_review date not null default current_date + 1,
  interval_days int not null default 1,
  success_count int not null default 0,
  review_count int not null default 0,
  status text not null default 'aktif' check (status in ('aktif', 'ogrenildi')),
  created_at timestamptz not null default now()
);

create table plan_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default my_family() references families on delete cascade,
  date date not null,
  subject text not null,
  topic_id text,
  kind text not null check (kind in ('konu', 'soru', 'tekrar', 'deneme')),
  title text not null,
  minutes int not null default 30,
  target_count int,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table xp_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default my_family() references families on delete cascade,
  kind text not null,
  amount int not null,
  created_at timestamptz not null default now()
);

-- ───────────── Ebeveyn verileri ─────────────
create table parent_notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default my_family() references families on delete cascade,
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  text text not null,
  seen boolean not null default false,
  created_at timestamptz not null default now()
);

create table question_reviews (
  family_id uuid not null default my_family() references families on delete cascade,
  question_id text not null,
  status text not null check (status in ('dogru', 'hatali')),
  note text,
  updated_at timestamptz not null default now(),
  primary key (family_id, question_id)
);

create index on daily_logs (family_id, date);
create index on quiz_attempts (family_id, created_at);
create index on wrong_bank (family_id, status, next_review);
create index on plan_items (family_id, date);
create index on xp_events (family_id, created_at);

-- ───────────── RLS ─────────────
alter table families enable row level security;
alter table profiles enable row level security;
alter table daily_logs enable row level security;
alter table quiz_attempts enable row level security;
alter table exams enable row level security;
alter table wrong_bank enable row level security;
alter table plan_items enable row level security;
alter table xp_events enable row level security;
alter table parent_notes enable row level security;
alter table question_reviews enable row level security;

create policy "aile okur" on families for select using (id = my_family());
create policy "aile ayarı günceller" on families for update using (id = my_family());
create policy "aile profilleri" on profiles for select using (family_id = my_family());

-- Öğrenci yazar, aile okur
do $$
declare t text;
begin
  foreach t in array array['daily_logs','quiz_attempts','exams','wrong_bank','plan_items','xp_events'] loop
    execute format('create policy "aile okur" on %I for select using (family_id = my_family())', t);
    execute format('create policy "öğrenci ekler" on %I for insert with check (family_id = my_family() and my_role() = ''student'')', t);
    execute format('create policy "öğrenci günceller" on %I for update using (family_id = my_family() and my_role() = ''student'')', t);
    execute format('create policy "öğrenci siler" on %I for delete using (family_id = my_family() and my_role() = ''student'')', t);
  end loop;
end $$;

-- Ebeveyn yazar, aile okur
create policy "aile okur" on parent_notes for select using (family_id = my_family());
create policy "ebeveyn ekler" on parent_notes for insert with check (family_id = my_family() and my_role() = 'parent');
create policy "ebeveyn günceller" on parent_notes for update using (family_id = my_family() and my_role() = 'parent');
create policy "ebeveyn siler" on parent_notes for delete using (family_id = my_family() and my_role() = 'parent');

-- Öğrenci notu yalnızca "okundu" işaretleyebilir, metnini değiştiremez.
create or replace function mark_note_seen(note_id uuid) returns void
language sql security definer set search_path = public as
$$ update parent_notes set seen = true where id = note_id and family_id = my_family() $$;

create policy "aile okur" on question_reviews for select using (family_id = my_family());
create policy "ebeveyn ekler" on question_reviews for insert with check (family_id = my_family() and my_role() = 'parent');
create policy "ebeveyn günceller" on question_reviews for update using (family_id = my_family() and my_role() = 'parent');

-- ───────────── Storage: yanlış soru fotoğrafları ─────────────
insert into storage.buckets (id, name, public) values ('wrong-photos', 'wrong-photos', false)
on conflict (id) do nothing;

create policy "aile foto okur" on storage.objects for select
  using (bucket_id = 'wrong-photos' and (storage.foldername(name))[1] = public.my_family()::text);
create policy "öğrenci foto yükler" on storage.objects for insert
  with check (bucket_id = 'wrong-photos' and (storage.foldername(name))[1] = public.my_family()::text and public.my_role() = 'student');
create policy "öğrenci foto siler" on storage.objects for delete
  using (bucket_id = 'wrong-photos' and (storage.foldername(name))[1] = public.my_family()::text and public.my_role() = 'student');
