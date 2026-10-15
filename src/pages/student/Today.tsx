import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp, useData } from '../../app/AppProvider'
import { useAward } from '../../app/useAward'
import { LogModal } from '../../components/LogModal'
import { Page, ProgressBar } from '../../components/ui'
import { SUBJECT_META } from '../../lib/content'
import { repo } from '../../lib/db'
import { daysBetween, today } from '../../lib/dates'
import { XP, levelInfo } from '../../lib/gamify'
import { isDue } from '../../lib/srs'
import { daySummaries, pct, streak } from '../../lib/stats'
import type { PlanItem } from '../../lib/types'

const KIND_ICON = { konu: '📘', soru: '✏️', tekrar: '🔁', deneme: '📝' }

export default function Today() {
  const { profile, refresh } = useApp()
  const d = useData()
  const award = useAward()
  const [plan, setPlan] = useState<PlanItem[] | null>(null)
  const [logOpen, setLogOpen] = useState(false)

  useEffect(() => { repo.listPlan(today(), today()).then(setPlan) }, [d])

  const totalXp = d.xp.reduce((n, e) => n + e.amount, 0)
  const lv = levelInfo(totalXp)
  const s = streak(d.xp)
  const left = daysBetween(today(), d.settings.exam_date)
  const sum = daySummaries(d.logs, d.attempts, today(), today())[0]
  const due = d.wrong.filter(isDue).length
  const notes = d.notes.filter((n) => !n.seen)
  const planDone = plan?.filter((p) => p.done).length ?? 0

  async function toggle(item: PlanItem) {
    await repo.updatePlanItem(item.id, { done: !item.done })
    if (!item.done) await award('plan', XP.planDone, '· görev tamam')
    await refresh()
  }

  return (
    <div className="pt-safe">
      <div className="bg-gradient-to-br from-brand-600 to-violet-600 px-4 pb-16 pt-5 text-white">
        <div className="mx-auto max-w-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/70">Merhaba {profile?.display_name} 👋</p>
              <h1 className="text-2xl font-extrabold">LGS'ye <span className="text-amber-300">{Math.max(0, left)}</span> gün</h1>
            </div>
            <div className="rounded-2xl bg-white/15 px-3 py-2 text-center">
              <div className="text-2xl leading-none">🔥</div>
              <div className="text-sm font-extrabold">{s} gün</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-bold text-white/80">
              <span>Seviye {lv.level} · {lv.title}</span><span>{lv.xpInLevel}/{lv.xpForNext} XP</span>
            </div>
            <ProgressBar value={pct(lv.xpInLevel, lv.xpForNext)} color="#fbbf24" className="bg-white/20" />
          </div>
        </div>
      </div>

      <Page>
        <div className="-mt-12 grid grid-cols-3 gap-2">
          {[
            ['Bugün soru', sum.solved],
            ['Doğruluk', sum.solved ? `%${pct(sum.correct, sum.solved)}` : '–'],
            ['Süre', `${sum.minutes} dk`],
          ].map(([l, v]) => (
            <div key={l} className="card p-3 text-center">
              <div className="text-xl font-extrabold">{v}</div>
              <div className="text-xs font-semibold text-slate-500">{l}</div>
            </div>
          ))}
        </div>

        <button className="btn-primary w-full py-3.5 text-base" onClick={() => setLogOpen(true)}>➕ Çözdüğüm soruları gir</button>

        {notes.map((n) => (
          <div key={n.id} className="card border-amber-200 bg-amber-50">
            <div className="text-xs font-bold text-amber-700">💌 Aileden not</div>
            <p className="mt-1 whitespace-pre-wrap">{n.text}</p>
            <button className="mt-2 text-sm font-bold text-amber-700" onClick={async () => { await repo.markNoteSeen(n.id); await refresh() }}>Okudum ✓</button>
          </div>
        ))}

        {due > 0 && (
          <Link to="/yanlislar" className="card flex items-center gap-3 border-rose-100 bg-rose-50">
            <span className="text-3xl">🔁</span>
            <div className="flex-1">
              <div className="font-extrabold text-rose-700">{due} yanlış tekrar bekliyor</div>
              <div className="text-sm text-rose-600">Eski yanlışlarını çöz, kalıcı öğren.</div>
            </div>
            <span className="text-rose-400">›</span>
          </Link>
        )}

        <section className="card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-extrabold">Bugünün planı</h2>
            <Link to="/program" className="text-sm font-bold text-brand-600">Program ›</Link>
          </div>
          {plan === null ? <p className="text-sm text-slate-400">…</p> : plan.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-slate-500">Bugün için plan yok.</p>
              <Link to="/program" className="btn-ghost mt-2">🗓️ Haftalık program oluştur</Link>
            </div>
          ) : (
            <>
              <ProgressBar value={pct(planDone, plan.length)} color="#22c55e" className="mb-3" />
              <ul className="space-y-2">
                {plan.map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <button onClick={() => toggle(p)} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 text-sm ${p.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>{p.done && '✓'}</button>
                    {p.topic_id ? (
                      <Link to={`/konu/${p.topic_id}`} className={`flex-1 text-sm ${p.done ? 'text-slate-400 line-through' : ''}`}>{KIND_ICON[p.kind]} {p.title}</Link>
                    ) : (
                      <Link to={p.kind === 'tekrar' ? '/yanlislar' : '/denemeler'} className={`flex-1 text-sm ${p.done ? 'text-slate-400 line-through' : ''}`}>{KIND_ICON[p.kind]} {p.title}</Link>
                    )}
                    <span className="text-xs text-slate-400">{p.minutes}dk</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="grid grid-cols-2 gap-2">
          <Link to="/cikmis" className="card text-center"><div className="text-2xl">🗂️</div><div className="text-sm font-bold">Çıkmış Sorular</div></Link>
          <a href="https://mebi.eba.gov.tr/" target="_blank" rel="noreferrer" className="card text-center"><div className="text-2xl">🎓</div><div className="text-sm font-bold">MEBİ (ücretsiz deneme)</div></a>
        </section>

        <section className="card">
          <h2 className="mb-2 font-extrabold">Bugün kaydettiklerim</h2>
          {d.logs.filter((l) => l.date === today()).length === 0 ? (
            <p className="text-sm text-slate-400">Henüz kayıt yok. Çözdüğün her test için yukarıdaki butonu kullan.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {d.logs.filter((l) => l.date === today()).map((l) => (
                <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{SUBJECT_META[l.subject].emoji} {SUBJECT_META[l.subject].name}{l.source ? ` · ${l.source}` : ''}</span>
                  <span className="font-bold"><span className="text-emerald-600">{l.correct}D</span> <span className="text-rose-600">{l.wrong}Y</span> <span className="text-slate-400">{l.empty}B</span></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Page>
      {logOpen && <LogModal open onClose={() => setLogOpen(false)} />}
    </div>
  )
}
