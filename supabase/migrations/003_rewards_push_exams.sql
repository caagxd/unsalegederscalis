-- LGS Hazırlık — 003: ödül sözleşmeleri, bildirim abonelikleri, deneme ayrıntıları
-- 002'den sonra SQL Editor'de bir kez çalıştırın. Tekrar çalıştırmak zararsızdır.

-- ───────────── Denemeler: yanlış konu etiketleri + MEB optik ayrıntısı ─────────────
alter table exams add column if not exists wrong_topics text[] not null default '{}';
alter table exams add column if not exists details jsonb; -- MEB çıkmış sınavı: { meb: "2025", session: "sozel", answers: {...} }

-- ───────────── Haftalık ödül sözleşmeleri (veli tanımlar) ─────────────
create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default my_family() references families on delete cascade,
  title text not null,                 -- "Hafta sonu sinema"
  metric text not null check (metric in ('soru', 'aktif_gun', 'plan', 'tekrar', 'deneme')),
  target int not null check (target > 0),
  active boolean not null default true,
  claimed_weeks date[] not null default '{}', -- ödülün verildiği haftaların pazartesisi
  created_at timestamptz not null default now()
);
alter table rewards enable row level security;
drop policy if exists "aile okur" on rewards;
drop policy if exists "veli ekler" on rewards;
drop policy if exists "veli günceller" on rewards;
drop policy if exists "veli siler" on rewards;
create policy "aile okur" on rewards for select using (family_id = my_family());
create policy "veli ekler" on rewards for insert with check (family_id = my_family() and my_role() = 'parent');
create policy "veli günceller" on rewards for update using (family_id = my_family() and my_role() = 'parent');
create policy "veli siler" on rewards for delete using (family_id = my_family() and my_role() = 'parent');

-- ───────────── Web Push abonelikleri (her cihaz bir satır) ─────────────
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  family_id uuid not null default my_family() references families on delete cascade,
  role text not null default my_role(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists "kendi aboneliği" on push_subscriptions;
create policy "kendi aboneliği" on push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid() and family_id = my_family());
