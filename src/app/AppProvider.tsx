import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { repo } from '../lib/db'
import type {
  DailyLog, Exam, FamilySettings, ParentNote, Profile, QuestionReview, QuizAttempt, WrongItem, XpEvent,
} from '../lib/types'

export interface AppData {
  settings: FamilySettings
  profiles: Profile[]
  logs: DailyLog[]
  attempts: QuizAttempt[]
  exams: Exam[]
  wrong: WrongItem[]
  xp: XpEvent[]
  notes: ParentNote[]
  reviews: QuestionReview[]
}

interface Ctx {
  profile: Profile | null
  authLoading: boolean
  data: AppData | null
  refresh: () => Promise<void>
  /** Öğrenci XP kazandığında kısa bir kutlama gösterir */
  celebrate: (msg: string) => void
  toast: string | null
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [data, setData] = useState<AppData | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    try { setProfile(await repo.currentProfile()) } finally { setAuthLoading(false) }
  }, [])

  useEffect(() => {
    loadProfile()
    return repo.onAuthChange(loadProfile)
  }, [loadProfile])

  const refresh = useCallback(async () => {
    const [settings, profiles, logs, attempts, exams, wrong, xp, notes, reviews] = await Promise.all([
      repo.getSettings(), repo.familyProfiles(), repo.listLogs(), repo.listAttempts(), repo.listExams(),
      repo.listWrong(), repo.listXp(), repo.listNotes(), repo.listReviews(),
    ])
    setData({ settings, profiles, logs, attempts, exams, wrong, xp, notes, reviews })
  }, [])

  useEffect(() => {
    if (profile) refresh().catch((e) => setToast('Veriler yüklenemedi: ' + e.message))
    else setData(null)
  }, [profile, refresh])

  const celebrate = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 2200)
  }, [])

  const value = useMemo(() => ({ profile, authLoading, data, refresh, celebrate, toast }), [profile, authLoading, data, refresh, celebrate, toast])
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const c = useContext(AppCtx)
  if (!c) throw new Error('AppProvider eksik')
  return c
}

/** Veri yüklendikten sonra kullanılan sayfalar için */
// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const { data } = useApp()
  if (!data) throw new Error('Veri henüz yüklenmedi')
  return data
}
