import { useState } from 'react'
import { useData } from '../../app/AppProvider'
import { Photo } from '../../components/Photo'
import { Empty, Modal, Page, PageHeader } from '../../components/ui'
import type { SubjectId } from '../../content/types'
import { SUBJECT_IDS, SUBJECT_META, getTopic } from '../../lib/content'
import { localDate, shortDate, today } from '../../lib/dates'
import { wrongStats } from '../../lib/stats'
import type { WrongItem } from '../../lib/types'

export default function ParentWrong() {
  const d = useData()
  const [filter, setFilter] = useState<SubjectId | 'hepsi'>('hepsi')
  const [open, setOpen] = useState<WrongItem | null>(null)
  const st = wrongStats(d.wrong)
  const list = filter === 'hepsi' ? d.wrong : d.wrong.filter((w) => w.subject === filter)

  // Hangi nedenler öne çıkıyor?
  const reasons = new Map<string, number>()
  for (const w of d.wrong) { const r = w.note?.match(/^\[([^\]]+)\]/)?.[1]; if (r) reasons.set(r, (reasons.get(r) ?? 0) + 1) }

  return (
    <>
      <PageHeader title="Yanlış Bankası" subtitle={`${st.total} soru · ${st.learned} öğrenildi · ${st.due} tekrar bekliyor`} />
      <Page>
        {reasons.size > 0 && (
          <section className="card">
            <h2 className="mb-2 text-sm font-extrabold">Yanlış nedenleri</h2>
            <div className="flex flex-wrap gap-1.5">
              {[...reasons.entries()].sort((a, b) => b[1] - a[1]).map(([r, n]) => <span key={r} className="chip bg-slate-100 py-1 text-slate-700">{r} · {n}</span>)}
            </div>
          </section>
        )}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {(['hepsi', ...SUBJECT_IDS] as const).map((id) => (
            <button key={id} onClick={() => setFilter(id)} className={`chip shrink-0 py-1.5 ${filter === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>
              {id === 'hepsi' ? 'Hepsi' : `${SUBJECT_META[id].emoji} ${SUBJECT_META[id].short} (${d.wrong.filter((w) => w.subject === id).length})`}
            </button>
          ))}
        </div>
        {list.length === 0 ? <Empty emoji="📸" title="Henüz yanlış eklenmemiş" /> : (
          <div className="grid grid-cols-3 gap-2">
            {list.map((w) => (
              <button key={w.id} onClick={() => setOpen(w)} className="relative overflow-hidden rounded-xl">
                <Photo path={w.photo_path} className="aspect-square w-full" />
                <span className="absolute left-1 top-1 rounded-md bg-white/90 px-1 text-xs">{SUBJECT_META[w.subject].emoji}</span>
                {w.status === 'ogrenildi' && <span className="absolute right-1 top-1 rounded-md bg-emerald-500 px-1 text-xs text-white">✓</span>}
                {w.status === 'aktif' && w.next_review < today() && <span className="absolute right-1 top-1 rounded-md bg-rose-500 px-1 text-xs text-white">gecikti</span>}
              </button>
            ))}
          </div>
        )}
      </Page>
      {open && (
        <Modal open onClose={() => setOpen(null)} title={getTopic(open.topic_id)?.topic.name ?? SUBJECT_META[open.subject].name}>
          <Photo path={open.photo_path} className="w-full rounded-xl" />
          <div className="mt-3 space-y-1 text-sm">
            {open.note && <p className="rounded-xl bg-amber-50 p-2">📝 {open.note}</p>}
            <p className="text-slate-500">Eklendi {shortDate(localDate(open.created_at))} · {open.review_count} tekrar · {open.success_count} başarılı üst üste</p>
            <p className="text-slate-500">{open.status === 'ogrenildi' ? '🧠 Öğrenildi' : `Sonraki tekrar: ${shortDate(open.next_review)}`}</p>
          </div>
        </Modal>
      )}
    </>
  )
}
