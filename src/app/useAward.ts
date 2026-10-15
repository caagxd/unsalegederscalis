import { useCallback } from 'react'
import { repo } from '../lib/db'
import { useApp } from './AppProvider'

/** XP verir ve kısa bir kutlama gösterir. Veli hesabında sessizce hiçbir şey yapmaz. */
export function useAward() {
  const { profile, celebrate } = useApp()
  return useCallback(async (kind: string, amount: number, msg = '') => {
    if (profile?.role !== 'student' || amount <= 0) return
    await repo.addXp(kind, amount)
    celebrate(`+${amount} XP ${msg}`.trim())
  }, [profile, celebrate])
}
