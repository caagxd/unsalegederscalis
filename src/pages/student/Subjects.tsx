import { Link } from 'react-router-dom'
import { useData } from '../../app/AppProvider'
import { Empty, Page, PageHeader, ProgressBar } from '../../components/ui'
import { SUBJECT_META, contentStats, subjects } from '../../lib/content'
import { pct, subjectStats, topicProgress } from '../../lib/stats'

export default function Subjects() {
  const d = useData()
  const prog = topicProgress(d.attempts)
  const ss = subjectStats(d.logs, d.attempts)
  const cs = contentStats()

  return (
    <>
      <PageHeader title="Dersler" subtitle={`${cs.topics} konu · ${cs.questions} alıştırma sorusu`} />
      <Page>
        {subjects.length === 0 && <Empty emoji="📦" title="İçerik henüz yüklenmedi" />}
        {subjects.map((s) => {
          const m = SUBJECT_META[s.id]
          const topics = s.units.flatMap((u) => u.topics)
          const avg = topics.length ? Math.round(topics.reduce((n, t) => n + (prog.get(t.id) ?? 0), 0) / topics.length) : 0
          const st = ss[s.id]
          return (
            <Link key={s.id} to={`/ders/${s.id}`} className="card flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl" style={{ background: m.color + '1a' }}>{m.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between">
                  <span className="font-extrabold">{s.name}</span>
                  <span className="text-xs font-bold text-slate-400">LGS: {m.count} soru</span>
                </div>
                <div className="text-xs text-slate-500">{s.units.length} ünite · {topics.length} konu · {st.solved} soru çözüldü{st.solved ? ` · %${pct(st.correct, st.solved)} doğru` : ''}</div>
                <ProgressBar value={avg} color={m.color} className="mt-2" />
              </div>
            </Link>
          )
        })}
      </Page>
    </>
  )
}
