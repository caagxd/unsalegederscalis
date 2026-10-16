import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp, useData } from '../../app/AppProvider'
import { LogModal } from '../../components/LogModal'
import { Page, PageHeader } from '../../components/ui'
import { MEB_BOOKS, MEB_EXAMS } from '../../content/mebExams'
import type { SubjectId } from '../../content/types'
import { examTotals } from '../../lib/stats'

const OTHER = [
  { emoji: '🎓', title: 'MEBİ Bireysel Öğrenme Platformu', desc: 'Ücretsiz 2026-27 LGS denemeleri (ilki 2–8 Kasım). Sonucunu Denemeler\'e gir.', url: 'https://mebi.eba.gov.tr/' },
  { emoji: '🧪', title: 'Örnek soru kitapçıkları', desc: 'ÖDSGM · yıl içinde yayımlanan örnek sorular', url: 'https://odsgm.meb.gov.tr/www/sinavlar/kategori/50' },
]
const BOOK_SUBJECT: Record<string, SubjectId> = { turkce: 'turkce', matematik: 'matematik', fen: 'fen', sozel: 'inkilap' }

export default function PastPapers() {
  const { profile } = useApp()
  const d = useData()
  const [log, setLog] = useState<SubjectId | null>(null)
  const isStudent = profile?.role === 'student'
  const doneExam = (exam: string, session: string) => d.exams.find((e) => e.details?.meb === exam && e.details?.session === session)

  return (
    <>
      <PageHeader title="Çıkmış Sorular" subtitle="Resmî MEB kitapçıkları" back />
      <Page>
        <section className="card border-emerald-100 bg-emerald-50 text-sm text-emerald-800">
          <b>Gerçek sınav provası:</b> kitapçık uygulamada açılır, süre işler, cevaplarını optik forma işaretlersin. Bitince MEB cevap anahtarıyla puanlanır ve Denemeler'e eklenir.
          Sözel ve sayısal bölümü aynı gün art arda çözmek gerçek LGS'ye en yakın provadır.
        </section>

        {MEB_EXAMS.map((e) => (
          <section key={e.id} className="card">
            <h2 className="mb-2 font-extrabold">LGS {e.year}</h2>
            <div className="grid grid-cols-2 gap-2">
              {e.sessions.map((s) => {
                const done = doneExam(e.id, s.id)
                return (
                  <Link key={s.id} to={`/cikmis/${e.id}/${s.id}`} className={`rounded-xl border-2 p-3 ${done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100'}`}>
                    <div className="font-bold">{s.id === 'sozel' ? '📖' : '📐'} {s.name}</div>
                    <div className="text-xs text-slate-500">{s.sections.reduce((n, x) => n + x.key.length, 0)} soru · {s.minutes} dk</div>
                    {done && <div className="mt-1 text-xs font-bold text-emerald-700">✓ çözüldü · {examTotals(done.results).total} net</div>}
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
        <p className="px-1 text-xs text-slate-400">2023 kitapçığı MEB sitesinde ayrı yayımlanmadığı için listede yok; 2018–2023 soruları aşağıdaki çalışma kitaplarında.</p>

        <section className="card space-y-3">
          <div>
            <h2 className="font-extrabold">📚 LGS Çalışma Kitapları (MEB)</h2>
            <p className="text-xs text-slate-500">Geçmiş yılların bütün çıkmış soruları ve örnek sorular, ders ders. Dosyalar çok büyük (40–215 MB): <b>Wi-Fi'da açın</b>. Telefonun kendi PDF görüntüleyicisinde açılır.</p>
          </div>
          {MEB_BOOKS.map((b) => (
            <div key={b.id} className="flex items-center gap-2">
              <a href={b.url} target="_blank" rel="noreferrer" className="flex-1 rounded-xl bg-slate-50 p-3">
                <div className="text-sm font-bold">{b.title} ↗</div>
                <div className="text-xs text-slate-500">{b.desc}</div>
              </a>
              {isStudent && <button className="btn-ghost px-3 text-xs" onClick={() => setLog(BOOK_SUBJECT[b.id])}>➕ Çözdüm</button>}
            </div>
          ))}
        </section>

        {OTHER.map((r) => (
          <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="card flex items-center gap-3">
            <span className="text-3xl">{r.emoji}</span>
            <span className="flex-1"><span className="block font-extrabold">{r.title}</span><span className="block text-xs text-slate-500">{r.desc}</span></span>
            <span className="text-slate-300">↗</span>
          </a>
        ))}
      </Page>
      {log && <LogModal open onClose={() => setLog(null)} preset={{ subject: log }} />}
    </>
  )
}
