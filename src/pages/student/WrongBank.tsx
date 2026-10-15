import { useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApp, useData } from '../../app/AppProvider'
import { useAward } from '../../app/useAward'
import { Photo } from '../../components/Photo'
import { Empty, Modal, Page, PageHeader } from '../../components/ui'
import type { SubjectId } from '../../content/types'
import { SUBJECT_IDS, SUBJECT_META, getSubject, getTopic } from '../../lib/content'
import { repo } from '../../lib/db'
import { daysBetween, localDate, shortDate, today } from '../../lib/dates'
import { XP } from '../../lib/gamify'
import { compressImage } from '../../lib/image'
import { LEARNED_AFTER, isDue, reviewResult } from '../../lib/srs'
import type { WrongItem } from '../../lib/types'

const REASONS = ['Konuyu bilmiyordum', 'Dikkatsizlik', 'Soruyu yanlış anladım', 'Süre yetmedi', 'İşlem hatası']
type Tab = 'tekrar' | 'aktif' | 'ogrenildi'

export default function WrongBank() {
  const d = useData()
  const [params] = useSearchParams()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [tab, setTab] = useState<Tab>('tekrar')
  const [filter, setFilter] = useState<SubjectId | 'hepsi'>('hepsi')
  const [reviewing, setReviewing] = useState<WrongItem | null>(null)

  const due = d.wrong.filter(isDue)
  const list = useMemo(() => {
    const base = tab === 'tekrar' ? due : d.wrong.filter((w) => w.status === tab)
    return filter === 'hepsi' ? base : base.filter((w) => w.subject === filter)
  }, [d.wrong, due, tab, filter])

  return (
    <>
      <PageHeader title="Yanlış Soru Bankası" subtitle={`${d.wrong.filter((w) => w.status === 'aktif').length} aktif · ${d.wrong.filter((w) => w.status === 'ogrenildi').length} öğrenildi`} />
      <Page>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = '' }} />
        <button onClick={() => fileRef.current?.click()} className="card flex w-full items-center gap-4 border-2 border-dashed border-brand-200 bg-brand-50 text-left">
          <span className="text-4xl">📸</span>
          <span>
            <span className="block font-extrabold text-brand-700">Yanlışımın fotoğrafını çek</span>
            <span className="block text-sm text-brand-600">Soruyu çek, nedenini yaz. Uygulama 1, 3, 7, 14 ve 30 gün sonra sana tekrar soracak.</span>
          </span>
        </button>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-bold">
          {([['tekrar', `Tekrar (${due.length})`], ['aktif', 'Aktif'], ['ogrenildi', 'Öğrenildi']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-lg py-2 ${tab === k ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{l}</button>
          ))}
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {(['hepsi', ...SUBJECT_IDS] as const).map((id) => (
            <button key={id} onClick={() => setFilter(id)} className={`chip shrink-0 py-1.5 ${filter === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>
              {id === 'hepsi' ? 'Hepsi' : `${SUBJECT_META[id].emoji} ${SUBJECT_META[id].short}`}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          tab === 'tekrar'
            ? <Empty emoji="🎉" title="Bugün tekrar edilecek yanlış yok">Yeni yanlışlarını eklemeyi unutma.</Empty>
            : <Empty emoji="🗂️" title="Burada henüz bir şey yok" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {list.map((w) => <WrongCard key={w.id} w={w} onOpen={() => setReviewing(w)} />)}
          </div>
        )}
      </Page>

      {file && <AddModal file={file} presetTopic={params.get('konu')} onClose={() => setFile(null)} />}
      {reviewing && <ReviewModal item={reviewing} onClose={() => setReviewing(null)} />}
    </>
  )
}

function WrongCard({ w, onOpen }: { w: WrongItem; onOpen: () => void }) {
  const t = getTopic(w.topic_id)
  const m = SUBJECT_META[w.subject]
  const days = daysBetween(today(), w.next_review)
  return (
    <button onClick={onOpen} className="card overflow-hidden p-0 text-left">
      <Photo path={w.photo_path} className="h-32 w-full" />
      <div className="space-y-1 p-2.5">
        <div className="text-xs font-extrabold" style={{ color: m.color }}>{m.emoji} {m.name}</div>
        {t && <div className="truncate text-xs text-slate-600">{t.topic.name}</div>}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {w.status === 'ogrenildi' ? '🧠 öğrenildi' : days <= 0 ? '🔔 bugün' : `${days} gün sonra`}
          </span>
          <span className="text-xs tracking-tighter">{'●'.repeat(w.success_count)}<span className="text-slate-200">{'●'.repeat(Math.max(0, LEARNED_AFTER - w.success_count))}</span></span>
        </div>
      </div>
    </button>
  )
}

function AddModal({ file, presetTopic, onClose }: { file: File; presetTopic: string | null; onClose: () => void }) {
  const { refresh } = useApp()
  const award = useAward()
  const preset = getTopic(presetTopic)
  const [subject, setSubject] = useState<SubjectId>(preset?.subject.id ?? 'matematik')
  const [topicId, setTopicId] = useState(preset?.topic.id ?? '')
  const [reason, setReason] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const preview = useMemo(() => URL.createObjectURL(file), [file])
  const topics = getSubject(subject)?.units.flatMap((u) => u.topics) ?? []

  async function save() {
    setBusy(true); setErr(null)
    try {
      const blob = await compressImage(file)
      const text = [reason && `[${reason}]`, note.trim()].filter(Boolean).join(' ')
      await repo.addWrong(blob, { subject, topic_id: topicId || null, note: text || null })
      await award('wrong-add', XP.wrongAdded, '· yanlış kaydedildi')
      await refresh()
      onClose()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title="Yanlışı kaydet">
      <div className="space-y-3">
        <img src={preview} alt="" className="max-h-64 w-full rounded-xl bg-slate-100 object-contain" />
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
          {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div>
          <label className="label">Neden yanlış yaptın?</label>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button key={r} onClick={() => setReason(reason === r ? null : r)} className={`chip py-1.5 ${reason === r ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{r}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Doğru cevap / kendine not</label>
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ör. Cevap C. Negatif üste ters çevirmeyi unuttum." />
        </div>
        {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
        <button className="btn-primary w-full" onClick={save} disabled={busy}>{busy ? 'Yükleniyor…' : 'Bankaya ekle'}</button>
      </div>
    </Modal>
  )
}

function ReviewModal({ item, onClose }: { item: WrongItem; onClose: () => void }) {
  const { refresh } = useApp()
  const award = useAward()
  const [showNote, setShowNote] = useState(false)
  const [busy, setBusy] = useState(false)
  const [zoom, setZoom] = useState(false)
  const t = getTopic(item.topic_id)

  async function result(solved: boolean) {
    setBusy(true)
    const patch = reviewResult(item, solved)
    await repo.updateWrong(item.id, patch)
    if (patch.status === 'ogrenildi') await award('wrong-learned', XP.wrongLearned, '· artık biliyorsun! 🧠')
    else await award('wrong-review', XP.wrongReviewed, '· tekrar')
    await refresh()
    onClose()
  }

  async function remove() {
    if (!confirm('Bu yanlışı bankadan silmek istediğine emin misin?')) return
    await repo.deleteWrong(item)
    await refresh()
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`${SUBJECT_META[item.subject].emoji} ${t?.topic.name ?? SUBJECT_META[item.subject].name}`}>
      <div className="space-y-3">
        <Photo path={item.photo_path} className={`w-full rounded-xl ${zoom ? '' : 'max-h-80 object-contain'}`} onClick={() => setZoom(!zoom)} />
        <div className="text-xs text-slate-400">Eklendi: {shortDate(localDate(item.created_at))} · {item.review_count} kez tekrar edildi</div>
        {item.note && (showNote
          ? <div className="rounded-xl bg-amber-50 p-3 text-sm">📝 {item.note}</div>
          : <button className="btn-ghost w-full text-sm" onClick={() => setShowNote(true)}>👀 Notumu göster (önce kendin çöz!)</button>)}
        {item.status === 'aktif' ? (
          <>
            <p className="text-center text-sm font-semibold text-slate-600">Soruyu kâğıtta yeniden çöz. Sonuç?</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn bg-rose-50 py-4 text-rose-600" disabled={busy} onClick={() => result(false)}>❌ Yine yapamadım</button>
              <button className="btn bg-emerald-500 py-4 text-white" disabled={busy} onClick={() => result(true)}>✅ Çözdüm</button>
            </div>
          </>
        ) : (
          <button className="btn-ghost w-full" onClick={async () => { await repo.updateWrong(item.id, { status: 'aktif', success_count: 0, interval_days: 1, next_review: today() }); await refresh(); onClose() }}>🔁 Tekrar listeye al</button>
        )}
        <button className="w-full py-2 text-xs font-bold text-slate-400" onClick={remove}>Sil</button>
      </div>
    </Modal>
  )
}
