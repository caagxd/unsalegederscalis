import { useState } from 'react'
import { useApp, useData } from '../../app/AppProvider'
import { useAward } from '../../app/useAward'
import { ExamCharts } from '../../components/ExamCharts'
import { Empty, Modal, Page, PageHeader } from '../../components/ui'
import { WrongTopicPicker } from '../../components/WrongTopicPicker'
import type { SubjectId } from '../../content/types'
import { SUBJECT_IDS, SUBJECT_META, getTopic } from '../../lib/content'
import { repo } from '../../lib/db'
import { shortDate, today } from '../../lib/dates'
import { XP } from '../../lib/gamify'
import { examTotals, net, round1 } from '../../lib/stats'
import type { Exam, ExamResults } from '../../lib/types'

export default function Exams() {
  const d = useData()
  const { profile } = useApp()
  const [open, setOpen] = useState(false)
  const exams = [...d.exams].reverse()

  return (
    <>
      <PageHeader title="Denemeler" subtitle={`${d.exams.length} deneme`}
        right={profile?.role === 'student' && <button className="btn-primary px-3 py-2 text-sm" onClick={() => setOpen(true)}>+ Deneme</button>} />
      <Page>
        {d.exams.length === 0 ? (
          <Empty emoji="📝" title="Henüz deneme yok">MEBİ'de ücretsiz LGS denemeleri var. Çözdüğün her denemeyi buraya gir, gelişimini gör.</Empty>
        ) : (
          <>
            <section className="card"><ExamCharts exams={d.exams} /></section>
            <ExamList exams={exams} canDelete={profile?.role === 'student'} />
          </>
        )}
      </Page>
      {open && <AddExam onClose={() => setOpen(false)} />}
    </>
  )
}

export function ExamList({ exams, canDelete }: { exams: Exam[]; canDelete?: boolean }) {
  const { refresh } = useApp()
  return (
    <>
      {exams.map((e) => {
        const t = examTotals(e.results)
        return (
          <details key={e.id} className="card">
            <summary className="flex cursor-pointer list-none items-center justify-between">
              <div>
                <div className="font-extrabold">{e.name}</div>
                <div className="text-xs text-slate-500">{shortDate(e.date)}{e.source ? ` · ${e.source}` : ''}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-brand-600">{t.total}</div>
                <div className="text-[10px] font-bold text-slate-400">NET · ağırlıklı {t.weighted}</div>
              </div>
            </summary>
            <table className="mt-3 w-full text-sm">
              <thead><tr className="text-xs text-slate-400"><th className="text-left">Ders</th><th>D</th><th>Y</th><th>B</th><th className="text-right">Net</th></tr></thead>
              <tbody>
                {SUBJECT_IDS.map((id) => {
                  const r = e.results[id]
                  return (
                    <tr key={id} className="border-t border-slate-50">
                      <td className="py-1">{SUBJECT_META[id].emoji} {SUBJECT_META[id].short}</td>
                      <td className="text-center text-emerald-600">{r?.d ?? '-'}</td>
                      <td className="text-center text-rose-600">{r?.y ?? '-'}</td>
                      <td className="text-center text-slate-400">{r?.b ?? '-'}</td>
                      <td className="text-right font-bold">{round1(net(r))}/{SUBJECT_META[id].count}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!!e.wrong_topics?.length && (
              <div className="mt-2 flex flex-wrap gap-1">
                {e.wrong_topics.map((t) => <span key={t} className="chip bg-rose-50 text-rose-600">{getTopic(t)?.topic.name ?? t}</span>)}
              </div>
            )}
            {canDelete && (
              <button className="mt-2 text-xs font-bold text-slate-400" onClick={async () => { if (confirm('Deneme silinsin mi?')) { await repo.deleteExam(e.id); await refresh() } }}>Sil</button>
            )}
          </details>
        )
      })}
    </>
  )
}

function AddExam({ onClose }: { onClose: () => void }) {
  const { refresh } = useApp()
  const award = useAward()
  const [name, setName] = useState('')
  const [date, setDate] = useState(today())
  const [source, setSource] = useState('')
  const [vals, setVals] = useState<Record<SubjectId, { d: string; y: string }>>(
    Object.fromEntries(SUBJECT_IDS.map((id) => [id, { d: '', y: '' }])) as Record<SubjectId, { d: string; y: string }>,
  )
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [wrongTopics, setWrongTopics] = useState<string[]>([])

  const results: ExamResults = {}
  for (const id of SUBJECT_IDS) {
    const dd = parseInt(vals[id].d || '0', 10), yy = parseInt(vals[id].y || '0', 10)
    results[id] = { d: dd, y: yy, b: Math.max(0, SUBJECT_META[id].count - dd - yy) }
  }
  const tot = examTotals(results)
  const invalid = SUBJECT_IDS.find((id) => results[id]!.d + results[id]!.y > SUBJECT_META[id].count)

  async function save() {
    if (!name.trim()) return setErr('Deneme adını yaz')
    if (invalid) return setErr(`${SUBJECT_META[invalid].name}: doğru + yanlış ${SUBJECT_META[invalid].count}'i geçemez`)
    setBusy(true)
    try {
      await repo.addExam({ name: name.trim(), date, source: source.trim() || null, results, wrong_topics: wrongTopics })
      await award('exam', XP.examAdded, '· deneme girildi')
      await refresh()
      onClose()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title="Deneme sonucu gir">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2"><label className="label">Deneme adı</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ör. MEBİ 1. Deneme" /></div>
          <div><label className="label">Tarih</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="label">Yayın</label><input className="input" value={source} onChange={(e) => setSource(e.target.value)} placeholder="isteğe bağlı" /></div>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-slate-500"><th className="text-left">Ders</th><th>Doğru</th><th>Yanlış</th><th className="text-right">Net</th></tr></thead>
          <tbody>
            {SUBJECT_IDS.map((id) => (
              <tr key={id}>
                <td className="py-1 font-semibold">{SUBJECT_META[id].emoji} {SUBJECT_META[id].short} <span className="text-xs text-slate-400">/{SUBJECT_META[id].count}</span></td>
                {(['d', 'y'] as const).map((k) => (
                  <td key={k} className="px-1"><input className={`input py-1.5 text-center font-bold ${invalid === id ? 'border-rose-400' : ''}`} inputMode="numeric" value={vals[id][k]}
                    onChange={(e) => setVals({ ...vals, [id]: { ...vals[id], [k]: e.target.value.replace(/\D/g, '').slice(0, 2) } })} /></td>
                ))}
                <td className="text-right font-bold">{round1(net(results[id]))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-between rounded-xl bg-brand-50 p-3 font-extrabold text-brand-700">
          <span>Toplam net: {tot.total}</span><span>Ağırlıklı: {tot.weighted}</span>
        </div>
        <WrongTopicPicker subjects={SUBJECT_IDS.filter((id) => (results[id]?.y ?? 0) > 0)} value={wrongTopics} onChange={setWrongTopics} />
        <p className="text-xs text-slate-400">Net = Doğru − Yanlış ÷ 3. Ağırlıklı nette Türkçe, Matematik ve Fen ×4 sayılır. Puan hesabı MEB'in standart puan formülüne bağlı olduğu için burada tahmin edilmez.</p>
        {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
        <button className="btn-primary w-full" onClick={save} disabled={busy}>Kaydet</button>
      </div>
    </Modal>
  )
}
