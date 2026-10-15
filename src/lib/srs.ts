import { addDays, today } from './dates'
import type { WrongItem } from './types'

// Yanlış soru bankası için basit aralıklı tekrar.
// Doğru çözdükçe aralık uzar: 1 → 3 → 7 → 14 → 30 gün.
// 3 başarılı tekrardan sonra soru "öğrenildi" sayılır (istenirse yine açılabilir).
export const INTERVALS = [1, 3, 7, 14, 30]
export const LEARNED_AFTER = 3

export function reviewResult(item: WrongItem, solved: boolean): Partial<WrongItem> {
  const review_count = item.review_count + 1
  if (!solved) {
    return { review_count, success_count: 0, interval_days: 1, next_review: addDays(today(), 1), status: 'aktif' }
  }
  const success_count = item.success_count + 1
  const idx = Math.min(INTERVALS.indexOf(item.interval_days) + 1, INTERVALS.length - 1)
  const interval_days = INTERVALS[Math.max(idx, 1)]
  return {
    review_count,
    success_count,
    interval_days,
    next_review: addDays(today(), interval_days),
    status: success_count >= LEARNED_AFTER ? 'ogrenildi' : 'aktif',
  }
}

export const isDue = (item: WrongItem) => item.status === 'aktif' && item.next_review <= today()
