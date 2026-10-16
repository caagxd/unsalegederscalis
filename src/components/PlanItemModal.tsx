import { useState } from 'react'
import type { SubjectId } from '../content/types'
import { useApp } from '../app/AppProvider'
import { useAward } from '../app/useAward'
import { SUBJECT_IDS, SUBJECT_META, getSubject, getTopic } from '../lib/content'
import { repo } from '../lib/db'
import { addDays, today } from '../lib/dates'
import { XP } from '../lib/gamify'
import type { PlanKind } from '../lib/types'
import { Modal } from './ui'

const KINDS: [PlanKind, string][] = [['konu', '📘 Konu çalıştım'], ['soru', '✏️ Soru çözdüm'], ['tekrar', '🔁 Tekrar yaptım'], ['deneme', '📝 Deneme çözdüm']]

// Programa elle görev ekler. Varsayılan: "bugün bunu çalıştım" (tamamlandı olarak).
export function PlanItemModal({ onClose, defaultDate = today(), onSaved }: { onClose: () => void; defaultDate?: string; onSaved?: () => void }) {
  const { refresh } = useApp()
  const award = useAward()
  const [date, setDate] = useState(defaultDate)
  const [subject, setSubject] = useState<SubjectId>('matematik')
  const [topicId, setTopicId] = useState('')
  const [kind, setKind] = useState<PlanKind>('konu')
  const [minutes, setMinutes] = useState('40')
  const [custom, setCustom] = useState('')
  const [done, setDone] = useState(defaultDate <= today())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const topics = getSubject(subject)?.units.flatMap((u) => u.topics.map((t) => ({ ...t, unit: u.name }))) ?? []
  const isPast = date <= today()

  async function save() {
    const mins = Math.max(5, Math.min(600, parseInt(minutes, 10) || 0))
    const t = getTopic(topicId)
    const label = custom.trim() || (t ? t.topic.name : 'Genel çalışma')
    setBusy(true); setErr(null)
    try {
      await repo.addPlanItems([{
        date, subject, topic_id: topicId || null, kind, minutes: mins, target_count: null,
        title: `${SUBJECT_META[subject].name}: ${label}`, done: done && isPast,
      }])
      if (done && isPast) await award('plan-manual', XP.manualDone, '· kaydedildi')
      await refresh()
      onSaved?.()
      onClose()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title="Programa ekle">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
          {[[addDays(today(), -1), 'Dün'], [today(), 'Bugün'], [addDays(today(), 1), 'Yarın']].map(([d, l]) => (
            <button key={d} onClick={() => { setDate(d); setDone(d <= today()) }} className={`rounded-xl border-2 py-2 ${date === d ? 'border-brand-500 bg-brand-50' : 'border-slate-100'}`}>{l}</button>
          ))}
        </div>
        <input className="input" type="date" value={date} onChange={(e) => { setDate(e.target.value); setDone(e.target.value <= today()) }} />
        <div className="grid grid-cols-3 gap-1.5">
          {SUBJECT_IDS.map((id) => (
            <button key={id} onClick={() => { setSubject(id); setTopicId('') }}
              className={`rounded-xl border-2 py-2 text-xs font-bold ${subject === id ? 'border-brand-500 bg-brand-50' : 'border-slate-100'}`}>
              {SUBJECT_META[id].emoji} {SUBJECT_META[id].short}
            </button>
          ))}
        </div>
        <select className="input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
          <option value="">Konu seç (önerilir)</option>
          {topics.map((t) => <option key={t.id} value={t.id}>{t.unit} › {t.name}</option>)}
        </select>
        <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="ya da kendi açıklaman (ör. okul ödevi, X kitabı test 5)" />
        <div className="grid grid-cols-2 gap-1.5">
          {KINDS.map(([k, l]) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-xl border-2 py-2 text-xs font-bold ${kind === k ? 'border-brand-500 bg-brand-50' : 'border-slate-100'}`}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-28"><label className="label">Süre (dk)</label><input className="input text-center font-bold" inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value.replace(/\D/g, ''))} /></div>
          {isPast && (
            <label className="mt-5 flex flex-1 items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-5 w-5" checked={done} onChange={(e) => setDone(e.target.checked)} /> Yaptım ✓
            </label>
          )}
        </div>
        {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
        <button className="btn-primary w-full" onClick={save} disabled={busy}>{done && isPast ? 'Çalıştım olarak kaydet' : 'Programa ekle'}</button>
        <p className="text-xs text-slate-400">Çözdüğün soru sayısını da girmek için "Çözdüğüm soruları gir"i kullan; böylece doğruluk oranın hesaplanır.</p>
      </div>
    </Modal>
  )
}
