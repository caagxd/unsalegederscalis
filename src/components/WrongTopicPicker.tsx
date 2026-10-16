import { useState } from 'react'
import type { SubjectId } from '../content/types'
import { SUBJECT_META, getSubject } from '../lib/content'

// Denemede yanlış yapılan konuları ders ders seçtirir. Seçimler programa ve "zayıf konular"a yansır.
export function WrongTopicPicker({ subjects, value, onChange }: {
  subjects: SubjectId[] // yalnızca yanlışı olan dersler
  value: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState<SubjectId | null>(subjects[0] ?? null)
  if (!subjects.length) return null
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])

  return (
    <div className="space-y-2 rounded-xl border border-slate-100 p-3">
      <div className="text-sm font-bold">Yanlış yaptığın konular <span className="font-normal text-slate-400">(isteğe bağlı, ama çok faydalı)</span></div>
      <div className="flex flex-wrap gap-1.5">
        {subjects.map((s) => {
          const n = value.filter((v) => v.startsWith(s + '-')).length
          return (
            <button key={s} type="button" onClick={() => setOpen(open === s ? null : s)}
              className={`chip py-1.5 ${open === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {SUBJECT_META[s].emoji} {SUBJECT_META[s].short}{n ? ` · ${n}` : ''}
            </button>
          )
        })}
      </div>
      {open && (
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {getSubject(open)?.units.map((u) => (
            <div key={u.id}>
              <div className="pt-1 text-[11px] font-bold uppercase text-slate-400">{u.no}. {u.name}</div>
              <div className="flex flex-wrap gap-1.5">
                {u.topics.map((t) => (
                  <button key={t.id} type="button" onClick={() => toggle(t.id)}
                    className={`chip py-1 text-left ${value.includes(t.id) ? 'bg-rose-500 text-white' : 'bg-slate-50 text-slate-700'}`}>{t.name}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
