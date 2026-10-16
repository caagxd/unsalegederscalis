# LGS Hazırlık

Bir 8. sınıf öğrencisinin LGS'ye hazırlanması için telefona kurulabilen web uygulaması (PWA) ve ailenin takip paneli.

**Öğrenci:** MEB çıkmış sınavlarını uygulama içinde optik formla çözme (2022–2026, otomatik puanlama) · haftalık ödül hedefleri · bildirimler · günlük plan (otomatik + elle "bugün bunu çalıştım") · konu anlatımı, konu videoları ve tekrar etmeyen alıştırma turları · ders bazında karma test · çalışma sayacı · çözdüğü soruları kaydetme · 📸 yanlış soru bankası (aralıklı tekrar) · 📱 günlük ekran süresi (ekran görüntüsüyle) · deneme takibi · çıkmış sorular (MEB) · XP, seviye, seri, rozet
**Veli:** haftalık karne · ders ve konu bazında başarı · en zayıf konular · deneme net grafiği · yanlış fotoğraflarını ve ekran süresi görüntülerini görme · okulda gelinen üniteyi ayarlama · not bırakma · yapay zekâ ile üretilen soruları kontrol etme

---

## 1. Hızlı deneme (kurulumsuz)

```bash
npm install
npm run dev
```

`.env` yoksa uygulama **demo modunda** açılır: veriler yalnızca o tarayıcıda saklanır, öğrenci/veli rolü giriş ekranından seçilir. Gerçek kullanım için 2. ve 3. adımları yapın.

## 2. Supabase kurulumu (ücretsiz, ~10 dk)

1. https://supabase.com adresinde hesap açın → **New project** (bölge: Frankfurt / `eu-central-1`).
2. **SQL Editor** → `supabase/migrations/001_init.sql` dosyasının tamamını yapıştırıp **Run**.
3. **Authentication → Sign In / Providers → Email**: **Confirm email** seçeneğini **kapatın**.
   Öğrenci hesabı gerçek e-posta kullanmaz (kullanıcı adı + PIN), bu yüzden onay e-postası gönderilemez.
4. **Project Settings → API**: `Project URL` ve `anon public` anahtarını kopyalayın.
5. Proje klasöründe `.env` oluşturun:

```bash
cp .env.example .env
```

   ve iki değeri doldurun.

### Veritabanı güncellemeleri

`supabase/migrations/` içindeki dosyaları **numara sırasıyla** SQL Editor'de çalıştırın. Her biri bir kez çalıştırılır; tekrar çalıştırmak zararsızdır.

| Dosya | Ne ekler |
|---|---|
| `001_init.sql` | Temel tablolar, güvenlik kuralları, fotoğraf deposu |
| `002_features.sql` | Ekran süresi, konu videoları (aile ekler), okul ilerlemesi ayarı |
| `003_rewards_push_exams.sql` | Ödül sözleşmeleri, bildirim abonelikleri, deneme konu etiketleri |

Migrasyon çalıştırılmadan da uygulama açılır; yalnızca o migrasyonun özellikleri kaydedilemez.

### Bildirimler (Web Push) — bir kerelik kurulum

Android'de ve iPhone'da (iOS 16.4+, uygulama **ana ekrana eklenmiş** olmalı) çalışır. Öğrenciye her akşam 20:00 hatırlatma, velilere pazar 20:30 haftalık karne gider.

1. **Sırlar:** `supabase/.secrets.local/edge-function-secrets.txt` dosyasındaki üç satırı Supabase → **Edge Functions → Secrets** bölümüne ekleyin. Bu klasör git'e girmez; dosya yoksa `node` ile yeni VAPID anahtarı üretip `src/lib/push.ts` içindeki herkese açık anahtarı da güncelleyin.
2. **Fonksiyon:** Supabase → **Edge Functions → Deploy a new function → Via Editor**. Adı `notify` olsun, `supabase/functions/notify/index.ts` içeriğini yapıştırıp **Deploy**. Ardından fonksiyon ayarlarında **Verify JWT / Enforce JWT verification** seçeneğini **kapatın** (zamanlayıcı kendi sırrıyla çağırır; "deneme bildirimi" kullanıcı oturumunu kendisi doğrular).
3. **Zamanlayıcı:** `supabase/.secrets.local/cron.sql` dosyasını SQL Editor'de çalıştırın (şablonu: `supabase/cron.sql.example`).
4. **Telefonlarda:** Öğrenci **Ben → Bildirimleri aç**, veli **Ayarlar → Bildirimleri aç**. Ardından **Deneme bildirimi** ile test edin.

## 3. Yayına alma (Vercel, ücretsiz)

1. Bu klasörü bir GitHub deposuna gönderin.
2. https://vercel.com → **Add New Project** → depoyu seçin (Vite otomatik algılanır).
   Supabase bağlantı bilgileri (URL + publishable key) `src/lib/db.ts` içinde üretim varsayılanı olarak durur; başka bir Supabase projesine geçerseniz orayı ya da ortam değişkenlerini güncelleyin.
3. **Environment Variables**: `VITE_SUPABASE_URL` ve `VITE_SUPABASE_ANON_KEY` (publishable key) ekleyin → **Deploy**.
   Supabase'i Vercel'in **Supabase entegrasyonu** ile bağladıysanız bu adımı atlayın: uygulama, entegrasyonun oluşturduğu `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` değişkenlerini de okur.
   Değişken ekledikten ya da değiştirdikten sonra **Redeploy** gerekir; değerler build sırasında pakete gömülür.

## 4. İlk kullanım

1. Veli: uygulamayı açın → **Veli kaydı** → e-posta + şifre. (İlk veli yeni bir "aile" oluşturur.)
2. Veli panelinde **Öğrenci hesabı oluştur**: ad, kullanıcı adı, 6 haneli PIN.
3. İkinci veli: **Veli kaydı** ekranında, birinci velinin **Ayarlar** sayfasındaki **aile kodunu** girer.
4. Öğrencinin telefonunda adresi açın:
   - **iPhone (Safari):** Paylaş → **Ana Ekrana Ekle**
   - **Android (Chrome):** ⋮ → **Uygulamayı yükle**
5. Öğrenci kullanıcı adı + PIN ile girer. **Program** ekranından ilk haftayı otomatik planlar.

## Güvenlik ve veri

- Her tabloda satır düzeyi güvenlik (RLS) açık. Bir aile yalnızca kendi verisini görür.
- Öğrenci kendi kayıtlarını yazar. Veli okur, not bırakır, soru kontrolü yapar; öğrencinin kayıtlarını değiştiremez.
- Yanlış fotoğrafları özel (private) bir depolama alanında tutulur ve süreli imzalı bağlantılarla gösterilir.
- Öğrenci, "Ben" sekmesinde ailesinin neleri gördüğünü açıkça görür.

## İçerik hakkında önemli not

`src/content/*.json` içindeki konu özetleri ve alıştırma soruları, 2026-27 MEB 8. sınıf programına göre **yapay zekâ ile hazırlandı**. Hata içerebilir.

- Tüm sorular "kontrol edilmedi" etiketiyle gelir.
- Veli, **İçerik** sekmesinden soruları "Doğru" veya "Hatalı" diye işaretler. Hatalı işaretlenen soru öğrenciden gizlenir.
- Öğrencinin sık yanlış yaptığı sorular ⚠️ ile işaretlenir; cevap anahtarı hatası en çok burada çıkar.
- **Asıl soru hacmi resmî kaynaklardan gelmeli:** MEB'in *LGS Çalışma Kitapları Seti* (2.815 çıkmış + örnek soru) ve *MEBİ* platformu (ücretsiz denemeler). İkisinin bağlantısı da **Çıkmış Sorular** ekranında var. Kitaptan çözülen sorular **Çözdüğüm soruları gir** ile kaydedilir ve takibe yansır.

İçerik denetimi:

```bash
npm run validate
```

## Geliştirme

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | İçeriği doğrular, tip denetimi yapar, üretim derlemesi alır |
| `npm run lint` | ESLint |
| `npm run validate` | İçerik şema denetimi ve özet |

Yapı:

- `src/lib/repo.ts` — veri arayüzü. `supabaseRepo.ts` gerçek kullanım, `localRepo.ts` demo modu için.
- `src/lib/srs.ts` — yanlış bankası tekrar aralıkları (1 → 3 → 7 → 14 → 30 gün; 3 başarılı tekrarda "öğrenildi").
- `src/lib/planner.ts` — haftalık program üretici.
- `src/lib/stats.ts` — net hesabı (D − Y/3), ağırlıklı net (TR/MAT/FEN ×4), konu başarıları.
- `src/lib/gamify.ts` — XP, seviye, rozetler.
- `src/lib/rewards.ts` — ödül sözleşmesi ölçümleri (haftalık soru, aktif gün, plan uyumu, tekrar, deneme).
- `src/content/mebExams.ts` — MEB çıkmış sınav kitapçıkları (bağlantı + cevap anahtarı). PDF'ler kopyalanmaz, MEB sunucusundan gösterilir.
- `supabase/functions/notify` — bildirim gönderici Edge Function.
