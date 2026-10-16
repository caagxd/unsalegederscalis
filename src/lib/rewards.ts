import { addDays, localDate, today, weekStart } from './dates'
import type { AppData } from '../app/AppProvider'
import type { PlanItem, Reward, RewardMetric } from './types'
import { daySummaries, pct } from './stats'

export const METRICS: Record<RewardMetric, { label: string; unit: string; hint: string }> = {
  soru: { label: 'Çözülen soru', unit: 'soru', hint: 'Uygulamadaki alıştırmalar + kitaptan girilenler' },
  aktif_gun: { label: 'Çalışılan gün', unit: 'gün', hint: 'En az bir şey kaydedilen gün sayısı' },
  plan: { label: 'Plan uyumu', unit: '%', hint: 'Haftalık programdaki görevlerin tamamlanma oranı' },
  tekrar: { label: 'Yanlış tekrarı', unit: 'tekrar', hint: 'Yanlış bankasında yapılan tekrar sayısı' },
  deneme: { label: 'Deneme', unit: 'deneme', hint: 'Girilen deneme sayısı' },
}

/** Bu haftanın (pazartesi–bugün) ölçüm değeri */
export function weekValue(metric: RewardMetric, d: AppData, weekPlan: PlanItem[]) {
  const ws = weekStart(today())
  const days = daySummaries(d.logs, d.attempts, ws, today())
  switch (metric) {
    case 'soru': return days.reduce((n, x) => n + x.solved, 0)
    case 'aktif_gun': {
      const xpDays = new Set(d.xp.map((e) => localDate(e.created_at)).filter((x) => x >= ws))
      return xpDays.size
    }
    case 'plan': return pct(weekPlan.filter((p) => p.done).length, weekPlan.length)
    case 'tekrar': return d.xp.filter((e) => (e.kind === 'wrong-review' || e.kind === 'wrong-learned') && localDate(e.created_at) >= ws).length
    case 'deneme': return d.exams.filter((e) => e.date >= ws && e.date <= addDays(ws, 6)).length
  }
}

export function rewardStatus(r: Reward, d: AppData, weekPlan: PlanItem[]) {
  const value = weekValue(r.metric, d, weekPlan)
  const ws = weekStart(today())
  return { value, done: value >= r.target, claimed: r.claimed_weeks.includes(ws), progress: Math.min(100, pct(value, r.target)), weekStart: ws }
}
