import { useMemo, useState } from 'react'
import { useApp, useData } from '../../app/AppProvider'
import { Page, PageHeader, ProgressBar } from '../../components/ui'
import type { SubjectId } from '../../content/types'
import { SUBJECT_META, allQuestions, getSubject, subjects } from '../../lib/content'
import { repo } from '../../lib/db'
import { pct } from '../../lib/stats'

const LETTERS = ['A', 'B', 'C', 'D']

// Yapay zekâ ile üretilen soruları velinin kontrol ettiği ekran.
// "Hatalı" işaretlenen soru öğrenciye gösterilmez.
export default function ParentQuestions() {
  const { refresh } = useApp()
  const d = useData()
  const [subject, setSubject] = useState<SubjectId>(subjects[0]?.id ?? 'matematik')
  const [onlyPending, setOnlyPending] = useState(true)
  const status = useMemo(() => new Map(d.reviews.map((r) => [r.question_id, r.status])), [d.reviews])
  const wrongRate = useMemo(() => {
    const m = new Map<string, { n: number; w: number }>()
    for (const a of d.attempts) { const s = m.get(a.question_id) ?? { n: 0, w: 0 }; s.n++; if (!a.correct) s.w++; m.set(a.question_id, s) }
    return m
  }, [d.attempts])

  const all = allQuestions()
  const reviewed = all.filter(({ q }) => status.has(q.id)).length
  const s = getSubject(subject)

  async function mark(id: string, st: 'dogru' | 'hatali') {
    let note: string | undefined
    if (st === 'hatali') note = prompt('Neyi hatalı? (isteğe bağlı)') ?? undefined
    await repo.setReview(id, st, note)
    await refresh()
  }

  return (
    <>
      <PageHeader title="İçerik Kontrolü" subtitle={`${reviewed}/${all.length} soru kontrol edildi`} />
      <Page>
        <section className="card space-y-2 text-sm text-slate-600">
          <ProgressBar value={pct(reviewed, all.length)} color="#22c55e" />
          <p>Konu özetleri ve alıştırmalar yapay zekâ ile hazırlandı ve hata içerebilir. Cevabı yanlış ya da belirsiz bir soruyu <b>Hatalı</b> diye işaretlerseniz öğrenciye gösterilmez. Öğrencinin çok yanlış yaptığı sorulara öncelik verin; ⚠️ işareti olanlar bunlar.</p>
        </section>

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {subjects.map((x) => (
            <button key={x.id} onClick={() => setSubject(x.id)} className={`chip shrink-0 py-1.5 ${subject === x.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>
              {SUBJECT_META[x.id].emoji} {SUBJECT_META[x.id].short}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} /> Yalnızca kontrol edilmemişler
        </label>

        {s?.units.flatMap((u) => u.topics).map((t) => {
          const qs = t.questions.filter((q) => !onlyPending || !status.has(q.id))
          if (!qs.length) return null
          return (
            <details key={t.id} className="card">
              <summary className="cursor-pointer font-extrabold">{t.name} <span className="text-xs font-normal text-slate-400">· {qs.length} soru</span></summary>
              <div className="mt-3 space-y-4">
                {qs.map((q) => {
                  const st = status.get(q.id)
                  const wr = wrongRate.get(q.id)
                  return (
                    <div key={q.id} className="rounded-xl border border-slate-100 p-3 text-sm">
                      {wr && wr.n >= 1 && wr.w / wr.n >= 0.5 && <div className="mb-1 text-xs font-bold text-amber-700">⚠️ Öğrenci {wr.n} denemenin {wr.w}'inde yanlış yaptı. Cevap anahtarını kontrol edin.</div>}
                      <p className="whitespace-pre-wrap font-semibold">{q.stem}</p>
                      <ol className="mt-2 space-y-0.5">
                        {q.choices.map((c, k) => <li key={k} className={k === q.answer ? 'font-bold text-emerald-700' : ''}>{LETTERS[k]}) {c}{k === q.answer && ' ✓'}</li>)}
                      </ol>
                      <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-slate-600">{q.explanation}</p>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => mark(q.id, 'dogru')} className={`btn flex-1 py-1.5 text-sm ${st === 'dogru' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'}`}>✓ Doğru</button>
                        <button onClick={() => mark(q.id, 'hatali')} className={`btn flex-1 py-1.5 text-sm ${st === 'hatali' ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-600'}`}>✗ Hatalı</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </details>
          )
        })}
      </Page>
    </>
  )
}
