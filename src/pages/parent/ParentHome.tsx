import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp, useData } from '../../app/AppProvider'
import { ActivityChart } from '../../components/ActivityChart'
import { CreateStudent } from '../../components/CreateStudent'
import { RewardsManager } from '../../components/Rewards'
import { Page, PageHeader, ProgressBar, Stat } from '../../components/ui'
import { SUBJECT_IDS, SUBJECT_META, getTopic } from '../../lib/content'
import { repo } from '../../lib/db'
import { addDays, daysBetween, fmtMinutes, localDate, shortDate, today, weekStart } from '../../lib/dates'
import { levelInfo } from '../../lib/gamify'
import { daySummaries, examMisses, examTotals, pct, streak, subjectStats, topicStats, weakestTopics, wrongStats } from '../../lib/stats'
import type { PlanItem } from '../../lib/types'

export default function ParentHome() {
  const { refresh } = useApp()
  const d = useData()
  const student = d.profiles.find((p) => p.role === 'student')
  const [range, setRange] = useState<'bu' | 'gecen'>('bu')
  const [plan, setPlan] = useState<PlanItem[]>([])
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [noteMsg, setNoteMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const ws = range === 'bu' ? weekStart(today()) : addDays(weekStart(today()), -7)
  const we = range === 'bu' ? today() : addDays(ws, 6)
  useEffect(() => { repo.listPlan(ws, we).then(setPlan) }, [ws, we, d])

  const days = daySummaries(d.logs, d.attempts, ws, we)
  const solved = days.reduce((n, x) => n + x.solved, 0)
  const correct = days.reduce((n, x) => n + x.correct, 0)
  const minutes = days.reduce((n, x) => n + x.minutes, 0)
  const activeDays = days.filter((x) => x.solved > 0 || x.minutes > 0).length
  const planDone = plan.filter((p) => p.done).length

  const weekLogs = d.logs.filter((l) => l.date >= ws && l.date <= we)
  const weekAttempts = d.attempts.filter((a) => { const x = localDate(a.created_at); return x >= ws && x <= we })
  const ss = subjectStats(weekLogs, weekAttempts)
  const weak = weakestTopics(topicStats(d.logs, d.attempts))
  const wst = wrongStats(d.wrong)
  const lastExam = d.exams[d.exams.length - 1]
  const prevExam = d.exams[d.exams.length - 2]
  const lastActivity = [...d.xp].sort((a, b) => b.created_at.localeCompare(a.created_at))[0]
  const totalXp = d.xp.reduce((n, e) => n + e.amount, 0)

  const examMissList = [...examMisses(d.exams).entries()].sort((x, y) => y[1] - x[1]).slice(0, 5)
  const st7 = d.screenTime.filter((s) => s.date > addDays(today(), -7))
  const screenSummary = st7.length
    ? `Son 7 günde ${st7.length} gün girildi · ortalama ${fmtMinutes(Math.round(st7.reduce((n, s) => n + s.minutes, 0) / st7.length))}`
    : 'Son 7 günde kayıt yok'

  async function sendNote() {
    const text = note.trim()
    if (!text || sending) return
    setSending(true); setNoteMsg(null)
    try {
      await repo.addNote(text)
      setNote('')
      // Not kaydedildikten sonra bildirim olarak da gönder; bildirim başarısız olsa bile not uygulamada görünür
      const msg = await repo.sendNotePush(text).then((m) => ({ ok: true, text: m }), (e: Error) => ({ ok: false, text: e.message }))
      setNoteMsg(msg)
      await refresh()
    } catch (e) {
      setNoteMsg({ ok: false, text: (e as Error).message })
    } finally { setSending(false) }
  }

  return (
    <>
      <PageHeader title={student ? `${student.display_name} · Karne` : 'Veli Paneli'}
        subtitle={`LGS'ye ${Math.max(0, daysBetween(today(), d.settings.exam_date))} gün · Seviye ${levelInfo(totalXp).level} · 🔥 ${streak(d.xp)} gün`} />
      <Page>
        {!student && repo.mode === 'supabase' && <CreateStudent />}

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-bold">
          {([['bu', 'Bu hafta'], ['gecen', 'Geçen hafta']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setRange(k)} className={`rounded-lg py-2 ${range === k ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{l}</button>
          ))}
        </div>

        <section className="card">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Çözülen soru" value={solved} hint={`${activeDays} aktif gün`} />
            <Stat label="Doğruluk" value={solved ? `%${pct(correct, solved)}` : '–'} />
            <Stat label="Kayıtlı süre" value={`${Math.floor(minutes / 60)}s ${minutes % 60}dk`} hint="öğrencinin girdiği" />
            <Stat label="Plan uyumu" value={plan.length ? `%${pct(planDone, plan.length)}` : '–'} hint={`${planDone}/${plan.length} görev`} />
          </div>
          {lastActivity && <p className="mt-3 text-xs text-slate-400">Son aktivite: {shortDate(localDate(lastActivity.created_at))} {new Date(lastActivity.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>}
        </section>

        <RewardsManager />

        <section className="card">
          <h2 className="mb-1 font-extrabold">Günlük soru (son 14 gün)</h2>
          <ActivityChart logs={d.logs} attempts={d.attempts} />
        </section>

        <section className="card">
          <h2 className="mb-3 font-extrabold">Ders bazında ({range === 'bu' ? 'bu hafta' : 'geçen hafta'})</h2>
          <ul className="space-y-2.5">
            {SUBJECT_IDS.map((id) => {
              const s = ss[id], m = SUBJECT_META[id]
              return (
                <li key={id}>
                  <div className="mb-0.5 flex justify-between text-sm">
                    <span className="font-bold">{m.emoji} {m.name}</span>
                    <span className="text-slate-500">{s.solved} soru{s.solved ? ` · %${pct(s.correct, s.solved)}` : ''}</span>
                  </div>
                  <ProgressBar value={s.solved ? pct(s.correct, s.solved) : 0} color={m.color} />
                </li>
              )
            })}
          </ul>
        </section>

        <section className="card">
          <h2 className="mb-2 font-extrabold">🎯 En zayıf konular</h2>
          {weak.length === 0 ? <p className="text-sm text-slate-400">Bir konuda en az 5 soru çözülünce burada görünür.</p> : (
            <ul className="divide-y divide-slate-100">
              {weak.map((w) => {
                const t = getTopic(w.topicId)
                return (
                  <li key={w.topicId}>
                    <Link to={`/konu/${w.topicId}`} className="flex items-center justify-between py-2 text-sm">
                      <span>{SUBJECT_META[w.subject].emoji} {t?.topic.name ?? w.topicId}</span>
                      <span className={`chip ${w.accuracy < 50 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'}`}>%{w.accuracy} · {w.solved} soru</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {examMissList.length > 0 && (
          <section className="card">
            <h2 className="mb-2 font-extrabold">📝 Denemelerde en çok yanlış</h2>
            <ul className="divide-y divide-slate-100">
              {examMissList.map(([id, n]) => (
                <li key={id}>
                  <Link to={`/konu/${id}`} className="flex items-center justify-between py-2 text-sm">
                    <span>{getTopic(id) ? `${SUBJECT_META[getTopic(id)!.subject.id].emoji} ${getTopic(id)!.topic.name}` : id}</span>
                    <span className="chip bg-rose-50 text-rose-600">{n} denemede</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link to="/veli/yanlislar" className="card">
            <div className="text-xs font-bold text-slate-500">📸 Yanlış bankası</div>
            <div className="text-2xl font-extrabold">{wst.active}</div>
            <div className="text-xs text-slate-500">aktif · {wst.learned} öğrenildi</div>
            {wst.due > 0 && <div className="mt-1 text-xs font-bold text-rose-600">{wst.due} tekrar gecikmiş/bugün</div>}
          </Link>
          <Link to="/veli/denemeler" className="card">
            <div className="text-xs font-bold text-slate-500">📝 Son deneme</div>
            {lastExam ? (
              <>
                <div className="text-2xl font-extrabold">{examTotals(lastExam.results).total} <span className="text-sm text-slate-400">net</span></div>
                <div className="text-xs text-slate-500">
                  {prevExam && (() => { const diff = Math.round((examTotals(lastExam.results).total - examTotals(prevExam.results).total) * 10) / 10; return <span className={diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{diff >= 0 ? '▲' : '▼'} {Math.abs(diff)} · </span> })()}
                  {shortDate(lastExam.date)}
                </div>
              </>
            ) : <div className="text-sm text-slate-400">henüz yok</div>}
          </Link>
        </div>

        <Link to="/veli/ekran" className="card flex items-center gap-3">
          <span className="text-2xl">📱</span>
          <span className="flex-1">
            <span className="block font-bold">Ekran süresi</span>
            <span className="block text-xs text-slate-500">{screenSummary}</span>
          </span>
          <span className="text-slate-300">›</span>
        </Link>

        <Link to="/program" className="card flex items-center gap-3"><span className="text-2xl">🗓️</span><span className="flex-1 font-bold">Haftalık programı gör</span><span className="text-slate-300">›</span></Link>

        <section className="card space-y-2">
          <h2 className="font-extrabold">💌 Not / bildirim gönder</h2>
          <p className="text-xs text-slate-500">Öğrencinin telefonuna anında bildirim olarak gider ve ana ekranında görünür. Takdir ve cesaretlendirme, eleştiriden daha çok işe yarar.</p>
          <div className="flex flex-wrap gap-1.5">
            {['Aferin, bugün çok iyi çalıştın! 💪', 'Yanlış tekrarlarını unutma 🔁', 'Ekran süreni girmeyi unutma 📱', 'Mola ver, su iç 💧'].map((q) => (
              <button key={q} type="button" className="chip bg-slate-100 py-1.5 text-slate-600" onClick={() => setNote(q)}>{q}</button>
            ))}
          </div>
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ör. Bu hafta matematikte çok iyi gidiyorsun, aferin! 💪" />
          <button className="btn-primary w-full" onClick={sendNote} disabled={!note.trim() || sending}>{sending ? 'Gönderiliyor…' : '📲 Gönder'}</button>
          {noteMsg && <p className={`text-sm font-semibold ${noteMsg.ok ? 'text-emerald-700' : 'text-amber-700'}`}>{noteMsg.text}</p>}
          {d.notes.slice(0, 5).map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-2 text-sm">
              <span className="flex-1 whitespace-pre-wrap">{n.text}</span>
              <span className="shrink-0 text-xs text-slate-400">{n.seen ? '✓✓ okundu' : '✓ gönderildi'}</span>
            </div>
          ))}
        </section>
      </Page>
    </>
  )
}
