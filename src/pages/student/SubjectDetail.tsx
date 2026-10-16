import { Link, useParams } from 'react-router-dom'
import { useData } from '../../app/AppProvider'
import { Empty, Page, PageHeader } from '../../components/ui'
import type { SubjectId } from '../../content/types'
import { SUBJECT_META, getSubject } from '../../lib/content'
import { topicProgress, topicStats } from '../../lib/stats'

export default function SubjectDetail() {
  const { subjectId } = useParams()
  const d = useData()
  const s = getSubject(subjectId as SubjectId)
  if (!s) return <><PageHeader title="Ders" back /><Page><Empty emoji="🤷" title="Ders bulunamadı" /></Page></>
  const m = SUBJECT_META[s.id]
  const prog = topicProgress(d.attempts)
  const stats = topicStats(d.logs, d.attempts)
  const limit = d.settings.school_progress?.[s.id]

  return (
    <>
      <PageHeader title={`${m.emoji} ${s.name}`} subtitle={`LGS'de ${m.count} soru`} back />
      <Page>
        <Link to={`/ders/${s.id}/test`} className="btn-primary w-full py-3">🎲 Karma test · 10 soru</Link>
        {s.units.map((u) => (
          <section key={u.id} className={`card ${limit && u.no > limit ? 'opacity-60' : ''}`}>
            <h2 className="mb-2 flex items-center justify-between text-xs font-extrabold uppercase tracking-wide text-slate-400">
              <span>{u.no}. Ünite · {u.name}</span>
              {limit && u.no > limit && <span className="chip bg-slate-100 normal-case tracking-normal text-slate-500">okulda henüz işlenmedi</span>}
            </h2>
            <ul className="divide-y divide-slate-100">
              {u.topics.map((t) => {
                const p = prog.get(t.id) ?? 0
                const st = stats.get(t.id)
                return (
                  <li key={t.id}>
                    <Link to={`/konu/${t.id}`} className="flex items-center gap-3 py-3">
                      <div className="relative h-10 w-10 shrink-0">
                        <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
                          <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                          <circle cx="18" cy="18" r="15" fill="none" stroke={m.color} strokeWidth="4" strokeDasharray={`${(p / 100) * 94.2} 94.2`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold">{p}%</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold">{t.name}</div>
                        <div className="text-xs text-slate-500">
                          {t.questions.length} alıştırma{st ? ` · ${st.solved} çözüldü · %${st.accuracy} doğru` : ''}
                        </div>
                      </div>
                      {st && st.solved >= 5 && st.accuracy < 60 && <span className="chip bg-rose-50 text-rose-600">zayıf</span>}
                      <span className="text-slate-300">›</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </Page>
    </>
  )
}
