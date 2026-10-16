import { useEffect, useState } from 'react'
import { useApp, useData } from '../app/AppProvider'
import { repo } from '../lib/db'
import { addDays, today, weekStart } from '../lib/dates'
import { METRICS, rewardStatus } from '../lib/rewards'
import type { PlanItem, RewardMetric } from '../lib/types'
import { ProgressBar } from './ui'

function useWeekPlan() {
  const d = useData()
  const [plan, setPlan] = useState<PlanItem[]>([])
  useEffect(() => {
    const ws = weekStart(today())
    repo.listPlan(ws, addDays(ws, 6)).then(setPlan).catch(() => setPlan([]))
  }, [d])
  return plan
}

/** Öğrencinin Bugün ekranındaki kart */
export function RewardsCard() {
  const d = useData()
  const plan = useWeekPlan()
  const active = d.rewards.filter((r) => r.active)
  if (!active.length) return null
  return (
    <section className="card space-y-3 border-amber-100 bg-gradient-to-br from-amber-50 to-white">
      <h2 className="font-extrabold">🎁 Bu haftanın hedefleri</h2>
      {active.map((r) => {
        const st = rewardStatus(r, d, plan)
        const m = METRICS[r.metric]
        return (
          <div key={r.id}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-bold">{r.title}</span>
              <span className="shrink-0 text-xs text-slate-500">{st.value}/{r.target} {m.unit}</span>
            </div>
            <ProgressBar value={st.progress} color={st.done ? '#22c55e' : '#f59e0b'} />
            <div className="mt-1 text-xs text-slate-500">
              {st.claimed ? '✅ Ödül verildi, tebrikler!' : st.done ? '🎉 Hedef tamam! Ödülünü isteyebilirsin.' : `${m.label} · pazar akşamına kadar`}
            </div>
          </div>
        )
      })}
    </section>
  )
}

/** Veli panelindeki yönetim bölümü */
export function RewardsManager() {
  const { refresh } = useApp()
  const d = useData()
  const plan = useWeekPlan()
  const [f, setF] = useState<{ title: string; metric: RewardMetric; target: string }>({ title: '', metric: 'soru', target: '300' })
  const [err, setErr] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  async function add() {
    const target = parseInt(f.target, 10)
    if (!f.title.trim() || !(target > 0)) return setErr('Ödül adı ve hedef gerekli')
    if (f.metric === 'plan' && target > 100) return setErr('Plan uyumu en fazla %100 olabilir')
    setErr(null)
    try {
      await repo.addReward({ title: f.title.trim(), metric: f.metric, target })
      setF({ ...f, title: '' }); setAdding(false)
      await refresh()
    } catch (e) {
      setErr((e as Error).message.includes('rewards') ? 'Önce 003 veritabanı güncellemesini çalıştırın (README).' : (e as Error).message)
    }
  }

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold">🎁 Ödül sözleşmesi</h2>
        <button className="text-sm font-bold text-brand-600" onClick={() => setAdding(!adding)}>{adding ? 'Vazgeç' : '+ Ekle'}</button>
      </div>
      <p className="text-xs text-slate-500">Haftalık hedef + somut ödül. Kardeşinizle birlikte belirleyin; ulaşılabilir ama emek isteyen hedefler en iyisi. Hafta pazartesi başlar.</p>

      {adding && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
          <input className="input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ödül (ör. Hafta sonu sinema)" />
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={f.metric} onChange={(e) => setF({ ...f, metric: e.target.value as RewardMetric })}>
              {(Object.keys(METRICS) as RewardMetric[]).map((k) => <option key={k} value={k}>{METRICS[k].label}</option>)}
            </select>
            <input className="input" inputMode="numeric" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value.replace(/\D/g, '') })} placeholder="Hedef" />
          </div>
          <p className="text-xs text-slate-500">{METRICS[f.metric].hint}. Hedef: haftada {f.target || '…'} {METRICS[f.metric].unit}.</p>
          {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
          <button className="btn-primary w-full" onClick={add}>Sözleşmeyi ekle</button>
        </div>
      )}

      {d.rewards.length === 0 && !adding && <p className="text-sm text-slate-400">Henüz ödül yok.</p>}
      {d.rewards.map((r) => {
        const st = rewardStatus(r, d, plan)
        return (
          <div key={r.id} className={`rounded-xl border border-slate-100 p-3 ${r.active ? '' : 'opacity-50'}`}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-bold">{r.title}</span>
              <span className="shrink-0 text-xs text-slate-500">{st.value}/{r.target} {METRICS[r.metric].unit}</span>
            </div>
            <ProgressBar value={st.progress} color={st.done ? '#22c55e' : '#f59e0b'} className="my-2" />
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {st.done && !st.claimed && r.active && (
                <button className="chip bg-emerald-500 py-1.5 text-white" onClick={async () => { await repo.updateReward(r.id, { claimed_weeks: [...r.claimed_weeks, st.weekStart] }); await refresh() }}>🎁 Verildi olarak işaretle</button>
              )}
              {st.claimed && <span className="chip bg-emerald-50 py-1.5 text-emerald-700">✅ Bu hafta verildi</span>}
              <button className="chip bg-slate-100 py-1.5 text-slate-600" onClick={async () => { await repo.updateReward(r.id, { active: !r.active }); await refresh() }}>{r.active ? 'Durdur' : 'Etkinleştir'}</button>
              <button className="chip bg-slate-100 py-1.5 text-slate-400" onClick={async () => { if (confirm('Ödül silinsin mi?')) { await repo.deleteReward(r.id); await refresh() } }}>Sil</button>
              <span className="ml-auto self-center font-normal text-slate-400">{r.claimed_weeks.length} kez kazanıldı</span>
            </div>
          </div>
        )
      })}
    </section>
  )
}
