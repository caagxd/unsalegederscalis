import { useState } from 'react'
import { Page, PageHeader } from '../../components/ui'

// Yalnızca MEB'in resmî sayfalarına bağlantı verilir; içerik kopyalanmaz.
const PAPERS = [
  { year: 2026, url: 'https://odsgm.meb.gov.tr/www/lgs-kapsamindaki-merkezi-sinavin-soru-kitapciklari-ve-cevap-anahtarlari-yayimlandi/icerik/1678' },
  { year: 2025, url: 'https://odsgm.meb.gov.tr/www/lgs-kapsamindaki-merkezi-sinav-tamamlandi-soru-kitapciklari-yayimlandi/icerik/1446' },
  { year: 2024, url: 'https://odsgm.meb.gov.tr/www/lgs-kapsamindaki-merkezi-sinav-tamamlandi-soru-kitapciklari-yayimlandi/icerik/1236' },
  { year: 2022, url: 'https://odsgm.meb.gov.tr/www/5-haziran-2022-tarihinde-yapilan-sinavla-ogrenci-alacak-ortaogretim-kurumlarina-iliskin-merkezi-sinavin-soru-kitapciklari-ve-cevap-anahtarlari/icerik/822' },
]

const RESOURCES = [
  { emoji: '📚', title: 'LGS Çalışma Kitapları Seti', desc: 'MEB · tüm çıkmış sorular ve örnek sorular, ders ders (2.815 soru, PDF)', url: 'https://odsgm.meb.gov.tr/www/lgs-calisma-kitaplari-seti/icerik/1583' },
  { emoji: '🎓', title: 'MEBİ Bireysel Öğrenme Platformu', desc: 'MEB · ücretsiz konu anlatımı, soru ve 2026-27 LGS denemeleri (ilki 2–8 Kasım)', url: 'https://mebi.eba.gov.tr/' },
  { emoji: '🧪', title: 'Örnek soru kitapçıkları', desc: 'ÖDSGM · yıl içinde yayımlanan örnek sorular', url: 'https://odsgm.meb.gov.tr/www/sinavlar/kategori/50' },
  { emoji: '📖', title: 'MEB Yardımcı Kaynaklar', desc: 'Ders bazında ücretsiz soru bankaları', url: 'https://yardimcikaynaklar.meb.gov.tr/' },
]

const KEY = 'lgs:cikmis-cozuldu'

export default function PastPapers() {
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
  })
  const toggle = (k: string) => {
    const next = { ...done, [k]: !done[k] }
    setDone(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* depolama kapalı olabilir */ }
  }

  return (
    <>
      <PageHeader title="Çıkmış Sorular" subtitle="Resmî MEB kaynakları" back />
      <Page>
        <section className="card border-emerald-100 bg-emerald-50 text-sm text-emerald-800">
          <b>Nasıl çalışmalı?</b> Çıkmış sınavı gerçek süreyle çöz: sözel 75 dk, sayısal 80 dk. Sonucunu <b>Denemeler</b>'e gir.
          Yanlışlarının fotoğrafını <b>Yanlış Bankası</b>'na ekle.
        </section>

        <section className="card">
          <h2 className="mb-2 font-extrabold">LGS soru kitapçıkları</h2>
          <ul className="divide-y divide-slate-100">
            {PAPERS.map((p) => (
              <li key={p.year} className="flex items-center gap-3 py-3">
                <button onClick={() => toggle(String(p.year))} className={`flex h-6 w-6 items-center justify-center rounded-md border-2 text-xs ${done[p.year] ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>{done[p.year] && '✓'}</button>
                <a href={p.url} target="_blank" rel="noreferrer" className="flex-1 font-bold">{p.year} LGS <span className="text-xs font-normal text-slate-500">· sözel + sayısal + cevap anahtarı</span></a>
                <span className="text-slate-300">↗</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-slate-400">Daha eski yılların (2018–2023) soruları, aşağıdaki Çalışma Kitapları Seti'nde ders ders yer alır.</p>
        </section>

        {RESOURCES.map((r) => (
          <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="card flex items-center gap-3">
            <span className="text-3xl">{r.emoji}</span>
            <span className="flex-1"><span className="block font-extrabold">{r.title}</span><span className="block text-xs text-slate-500">{r.desc}</span></span>
            <span className="text-slate-300">↗</span>
          </a>
        ))}
      </Page>
    </>
  )
}
