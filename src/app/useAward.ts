import { useCallback } from 'react'
import { repo } from '../lib/db'
import { useApp } from './AppProvider'

/** Plan görevi başına XP yalnızca bir kez verilir (işaretle-kaldır ile puan toplanmasın). */
export function usePlanAward() {
  const { data } = useApp()
  const award = useAward()
  return useCallback(async (itemId: string, amount: number) => {
    const kind = `plan:${itemId}`
    if (data?.xp.some((e) => e.kind === kind)) return
    await award(kind, amount, '· görev tamam')
  }, [data, award])
}

/** XP verir ve kısa bir kutlama gösterir. Veli hesabında sessizce hiçbir şey yapmaz. */
export function useAward() {
  const { profile, celebrate } = useApp()
  return useCallback(async (kind: string, amount: number, msg = '') => {
    if (profile?.role !== 'student' || amount <= 0) return
    await repo.addXp(kind, amount)
    celebrate(`+${amount} XP ${msg}`.trim())
  }, [profile, celebrate])
}
