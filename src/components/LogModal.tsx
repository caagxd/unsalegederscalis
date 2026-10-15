import { useState } from 'react'
import type { SubjectId } from '../content/types'
import { useApp } from '../app/AppProvider'
import { useAward } from '../app/useAward'
import { SUBJECT_IDS, SUBJECT_META, getSubject } from '../lib/content'
import { repo } from '../lib/db'
import { today } from '../lib/dates'
import { XP } from '../lib/gamify'
import { Modal } from './ui'

// Kitaptan / testten çözülen soruları kaydetme formu.
export function LogModal({ open, onClose, preset }: { open: boolean; onClose: () => void; preset?: { subject?: SubjectId; topicId?: string | null } }) {
  const { refresh } = useApp()
  const award = useAward()
  const [subject, setSubject] = useState<SubjectId>(preset?.subject ?? 'matematik')
  const [topicId, setTopicId] = useState<string>(preset?.topicId ?? '')
  const [n, setN] = useState({ correct: '', wrong: '', empty: '', minutes: '', source: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const num = (s: string) => Math.max(0, parseInt(s || '0', 10) || 0)
  const solved = num(n.correct) + num(n.wrong) + num(n.empty)
  const topics = getSubject(subject)?.units.flatMap((u) => u.topics.map((t) => ({ ...t, unit: u.name }))) ?? []

  async function save() {
    if (!solved) return setErr('En az bir soru gir')
    setBusy(true); setErr(null)
    try {
      await repo.addLog({
        date: today(), subject, topic_id: topicId || null, solved,
        correct: num(n.correct), wrong: num(n.wrong), empty: num(n.empty),
        minutes: num(n.minutes), source: n.source.trim() || null,
      })
      await award('log', solved * XP.logPerQuestion, `· ${solved} soru`)
      await refresh()
      setN({ correct: '', wrong: '', empty: '', minutes: '', source: '' })
      onClose()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const field = (k: keyof typeof n, label: string, cls: string) => (
    <div>
      <label className={`label ${cls}`}>{label}</label>
      <input className="input text-center text-lg font-bold" inputMode="numeric" value={n[k]} onChange={(e) => setN({ ...n, [k]: e.target.value.replace(/\D/g, '') })} placeholder="0" />
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title="Çözdüğüm soruları kaydet">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-1.5">
          {SUBJECT_IDS.map((id) => (
            <button key={id} onClick={() => { setSubject(id); setTopicId('') }}
              className={`rounded-xl border-2 px-1 py-2 text-xs font-bold ${subject === id ? 'border-brand-500 bg-brand-50' : 'border-slate-100'}`}>
              {SUBJECT_META[id].emoji} {SUBJECT_META[id].name}
            </button>
          ))}
        </div>
        <div>
          <label className="label">Konu (isteğe bağlı ama önerilir)</label>
          <select className="input" value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">— Karışık / konu seçme —</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.unit} › {t.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {field('correct', 'Doğru', 'text-emerald-600')}
          {field('wrong', 'Yanlış', 'text-rose-600')}
          {field('empty', 'Boş', 'text-slate-500')}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {field('minutes', 'Süre (dk)', '')}
          <div><label className="label">Kaynak</label><input className="input" value={n.source} onChange={(e) => setN({ ...n, source: e.target.value })} placeholder="ör. X yayınları s.42" /></div>
        </div>
        {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
        <p className="text-xs text-slate-500">💡 Yanlış yaptığın soruların fotoğrafını <b>Yanlışlar</b> sekmesinden çekmeyi unutma.</p>
        <button className="btn-primary w-full" onClick={save} disabled={busy}>Kaydet · {solved} soru</button>
      </div>
    </Modal>
  )
}
