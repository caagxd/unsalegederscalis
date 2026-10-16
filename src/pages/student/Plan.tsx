import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp, useData } from '../../app/AppProvider'
import { usePlanAward } from '../../app/useAward'
import { PlanItemModal } from '../../components/PlanItemModal'
import { Page, PageHeader, ProgressBar } from '../../components/ui'
import { SUBJECT_META } from '../../lib/content'
import { repo } from '../../lib/db'
import { addDays, dayName, shortDate, today, weekStart } from '../../lib/dates'
import { XP } from '../../lib/gamify'
import { generateWeek } from '../../lib/planner'
import { pct, topicProgress, topicStats } from '../../lib/stats'
import type { PlanItem } from '../../lib/types'

const KIND_ICON = { konu: '📘', soru: '✏️', tekrar: '🔁', deneme: '📝' }

export default function Plan() {
  const { profile, refresh } = useApp()
  const d = useData()
  const awardPlan = usePlanAward()
  const [adding, setAdding] = useState(false)
  const [start, setStart] = useState(weekStart(today()))
  const [items, setItems] = useState<PlanItem[] | null>(null)
  const [busy, setBusy] = useState(false)
  const end = addDays(start, 6)
  const isStudent = profile?.role === 'student'

  const load = useCallback(() => repo.listPlan(start, end).then(setItems), [start, end])
  useEffect(() => { load() }, [load, d])

  async function generate() {
    if (!items) return
    const pending = items.filter((i) => !i.done && i.date >= today())
    if (pending.length && !confirm('Bu haftanın tamamlanmamış görevleri yenileriyle değiştirilecek. Devam?')) return
    setBusy(true)
    try {
      await repo.deletePlanItems(pending.map((i) => i.id))
      const from = start < today() ? today() : start
      const week = generateWeek({ start: from, settings: d.settings, topicStats: topicStats(d.logs, d.attempts), progress: topicProgress(d.attempts) })
      await repo.addPlanItems(week.filter((w) => w.date <= end))
      await load()
    } finally { setBusy(false) }
  }

  async function toggle(it: PlanItem) {
    if (!isStudent) return
    await repo.updatePlanItem(it.id, { done: !it.done })
    if (!it.done) await awardPlan(it.id, XP.planDone)
    await refresh()
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const done = items?.filter((i) => i.done).length ?? 0

  return (
    <>
      <PageHeader title="Çalışma Programı" back subtitle={`${shortDate(start)} – ${shortDate(end)}`}
        right={<div className="flex gap-1">
          {isStudent && <button className="btn-primary px-3 py-2" onClick={() => setAdding(true)} aria-label="Görev ekle">+</button>}
          <button className="btn-ghost px-3 py-2" onClick={() => setStart(addDays(start, -7))}>‹</button>
          <button className="btn-ghost px-3 py-2" onClick={() => setStart(addDays(start, 7))}>›</button>
        </div>} />
      <Page>
        <section className="card space-y-2">
          <div className="flex justify-between text-sm font-bold"><span>Haftalık ilerleme</span><span>{done}/{items?.length ?? 0}</span></div>
          <ProgressBar value={pct(done, items?.length ?? 0)} color="#22c55e" />
          {isStudent && end >= today() && (
            <button className="btn-primary mt-2 w-full" onClick={generate} disabled={busy}>✨ {items?.length ? 'Kalan günleri yeniden planla' : 'Bu haftayı otomatik planla'}</button>
          )}
          <p className="text-xs text-slate-500">
            Program; hafta içi {d.settings.weekday_minutes} dk, hafta sonu {d.settings.weekend_minutes} dk çalışmaya göre, zayıf konuların önce gelecek şekilde hazırlanır.
            Pazar günleri tam deneme vardır.
            {Object.keys(d.settings.school_progress ?? {}).length > 0 && ' Yalnızca okulda işlenmiş üniteler planlanır.'}{!isStudent && ' Süreleri Ayarlar\'dan değiştirebilirsiniz.'}
          </p>
        </section>

        {days.map((day) => {
          const list = items?.filter((i) => i.date === day) ?? []
          const isToday = day === today()
          return (
            <section key={day} className={`card ${isToday ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="font-extrabold">{dayName(day)} {isToday && <span className="chip bg-brand-600 text-white">bugün</span>}</h3>
                <span className="text-xs text-slate-400">{shortDate(day)} · {list.reduce((n, i) => n + i.minutes, 0)} dk</span>
              </div>
              {list.length === 0 ? <p className="text-sm text-slate-300">—</p> : (
                <ul className="space-y-2">
                  {list.map((it) => (
                    <li key={it.id} className="flex items-center gap-3">
                      <button onClick={() => toggle(it)} disabled={!isStudent}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-xs ${it.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>{it.done && '✓'}</button>
                      <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: it.subject === 'genel' ? '#94a3b8' : SUBJECT_META[it.subject].color }} />
                      <Link to={it.topic_id ? `/konu/${it.topic_id}` : it.kind === 'tekrar' ? '/yanlislar' : '/denemeler'}
                        className={`flex-1 text-sm ${it.done ? 'text-slate-400 line-through' : ''}`}>{KIND_ICON[it.kind]} {it.title}</Link>
                      <span className="text-xs text-slate-400">{it.minutes}dk</span>
                      {isStudent && !it.done && (
                        <button className="px-1 text-slate-300 hover:text-rose-500" aria-label="Görevi sil"
                          onClick={async () => { await repo.deletePlanItems([it.id]); await load() }}>×</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </Page>
      {adding && <PlanItemModal onClose={() => setAdding(false)} onSaved={load} />}
    </>
  )
}
