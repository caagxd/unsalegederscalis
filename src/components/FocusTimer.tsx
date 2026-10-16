import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../app/AppProvider'
import { useAward } from '../app/useAward'
import type { SubjectId } from '../content/types'
import { getTopic } from '../lib/content'
import { repo } from '../lib/db'
import { today } from '../lib/dates'
import { XP } from '../lib/gamify'

// Çalışma sayacı: konu sayfasından başlatılır, sayfa değişse de sürer (cihazda saklanır).
// Bitince süre günlük kayda "dakika" olarak işlenir; veli panelindeki süre böylece gerçeğe yaklaşır.
const KEY = 'lgs:timer'
const MAX_MIN = 240

interface Running { topicId: string; subject: SubjectId; start: number }

function readTimer(): Running | null {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null }
}
function writeTimer(t: Running | null) {
  try { if (t) localStorage.setItem(KEY, JSON.stringify(t)); else localStorage.removeItem(KEY) } catch { /* depolama kapalı */ }
  window.dispatchEvent(new Event('lgs-timer'))
}

function useTimer() {
  const [t, setT] = useState<Running | null>(readTimer)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const sync = () => setT(readTimer())
    window.addEventListener('lgs-timer', sync)
    window.addEventListener('storage', sync)
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => { window.removeEventListener('lgs-timer', sync); window.removeEventListener('storage', sync); clearInterval(iv) }
  }, [])
  return { t, elapsed: t ? Math.max(0, Math.floor((now - t.start) / 1000)) : 0 }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

function useStop() {
  const { refresh, celebrate } = useApp()
  const award = useAward()
  return async (t: Running, elapsed: number) => {
    writeTimer(null)
    const minutes = Math.min(MAX_MIN, Math.round(elapsed / 60))
    if (minutes < 1) return celebrate('1 dakikadan kısa, kaydedilmedi')
    await repo.addLog({ date: today(), subject: t.subject, topic_id: t.topicId, solved: 0, correct: 0, wrong: 0, empty: 0, minutes, source: 'Çalışma sayacı' })
    await award('focus', Math.floor(minutes / 10) * XP.focusPerTenMin, `· ${minutes} dk çalıştın`)
    await refresh()
  }
}

/** Konu sayfasındaki başlat/bitir düğmesi */
export function FocusTimerButton({ topicId, subject }: { topicId: string; subject: SubjectId }) {
  const { profile } = useApp()
  const { t, elapsed } = useTimer()
  const stop = useStop()
  if (profile?.role !== 'student') return null
  if (t && t.topicId === topicId) {
    return (
      <button className="btn w-full bg-emerald-500 py-3 text-white" onClick={() => stop(t, elapsed)}>
        ⏹️ Bitir ve kaydet · <span className="font-mono">{fmt(elapsed)}</span>
      </button>
    )
  }
  return (
    <button className="btn-ghost w-full py-3" disabled={!!t} onClick={() => writeTimer({ topicId, subject, start: Date.now() })}>
      ⏱️ {t ? 'Başka konuda sayaç çalışıyor' : 'Çalışma sayacını başlat'}
    </button>
  )
}

/** Sayaç çalışırken her ekranda görünen küçük gösterge */
export function FocusTimerPill() {
  const { t, elapsed } = useTimer()
  if (!t) return null
  const name = getTopic(t.topicId)?.topic.name ?? 'Çalışma'
  return (
    <Link to={`/konu/${t.topicId}`} className="fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg">
      ⏱️ <span className="max-w-[160px] truncate">{name}</span> <span className="font-mono">{fmt(elapsed)}</span>
    </Link>
  )
}
