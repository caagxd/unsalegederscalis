-- Kayıt (signup) 500 hatasının teşhisi. SQL Editor'de çalıştırın; sonuç tablo olarak görünür.
-- Hiçbir şey kalıcı olarak değişmez: deneme veli + öğrenci eklenir ve hemen geri alınır.

create temp table if not exists teshis (adim text, sonuc text);
truncate teshis;

do $$
declare
  v_parent uuid := gen_random_uuid();
  v_student uuid := gen_random_uuid();
  v_code text;
  v_step text := 'veli kaydı';
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (v_parent, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'teshis-veli-' || v_parent || '@example.com', '{}'::jsonb,
            '{"role":"parent","display_name":"Teşhis Veli","family_code":""}'::jsonb, now(), now());
    insert into teshis values (v_step, 'tamam');

    v_step := 'öğrenci kaydı';
    select f.join_code into v_code from public.families f join public.profiles p on p.family_id = f.id where p.id = v_parent;
    insert into auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    values (v_student, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'teshis@ogrenci.lgs-hazirlik.app', '{}'::jsonb,
            jsonb_build_object('role', 'student', 'display_name', 'Teşhis Öğrenci', 'family_code', v_code), now(), now());
    insert into teshis values (v_step, 'tamam (aile kodu ' || v_code || ')');

    raise exception using errcode = 'P0001', message = 'GERI_AL';
  exception when others then
    if sqlerrm <> 'GERI_AL' then
      insert into teshis values (v_step, 'HATA: ' || sqlerrm || ' (SQLSTATE ' || sqlstate || ')');
    end if;
  end;
end $$;

-- Daha önce gerçekten oluşmuş hesaplar (kayıt aslında başarılı olmuş olabilir)
insert into teshis
select 'mevcut hesap', u.email || ' → ' || coalesce(p.role || ' profili var', 'PROFİL YOK') || ' · ' || to_char(u.created_at, 'DD.MM HH24:MI')
from auth.users u left join public.profiles p on p.id = u.id
order by u.created_at desc limit 5;

select adim, sonuc from teshis;
