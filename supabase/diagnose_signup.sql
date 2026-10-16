-- Kayıt (signup) 500 hatasının teşhisi. SQL Editor'de çalıştırın.
-- Hiçbir şey kalıcı olarak değişmez: deneme kullanıcısı eklenir, hata yazdırılır, her şey geri alınır.

-- 1) auth.users üzerinde hangi tetikleyiciler var? (yalnızca on_auth_user_created beklenir)
select tgname as tetikleyici, tgfoid::regproc as fonksiyon, tgenabled as durum
from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal;

-- 2) Kaydı taklit et ve gerçek hata mesajını göster
do $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'teshis-' || v_id || '@example.com', '{}'::jsonb,
          '{"role":"parent","display_name":"Teşhis","family_code":""}'::jsonb, now(), now());
  raise exception 'TEŞHİS: kayıt başarılı, tetikleyici çalışıyor (bu mesaj değişikliği geri almak içindir)';
exception when others then
  raise notice 'SONUÇ: % (SQLSTATE %)', sqlerrm, sqlstate;
end $$;
