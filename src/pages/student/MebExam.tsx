import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../../app/AppProvider'
import { useAward } from '../../app/useAward'
import { PdfViewer } from '../../components/PdfViewer'
import { Empty, Modal, Page, PageHeader } from '../../components/ui'
import { WrongTopicPicker } from '../../components/WrongTopicPicker'
import { MEB_EXAMS, getMebSession } from '../../content/mebExams'
import type { SubjectId } from '../../content/types'
import { SUBJECT_META } from '../../lib/content'
import { repo } from '../../lib/db'
import { today } from '../../lib/dates'
import { XP } from '../../lib/gamify'
import { examTotals, net, round1 } from '../../lib/stats'
import type { ExamResults } from '../../lib/types'

const LETTERS = ['A', 'B', 'C', 'D'] as const
type Answers = Partial<Record<SubjectId, (string | null)[]>>
interface Saved { answers: Answers; startedAt: number }

const storeKey = (exam: string, session: string) => `lgs:meb:${exam}:${session}`
function loadSaved(k: string): Saved | null {
  try { return JSON.parse(localStorage.getItem(k) ?? 'null') } catch { return null }
}
function save(k: string, v: Saved | null) {
  try { if (v) localStorage.setItem(k, JSON.stringify(v)); else localStorage.removeItem(k) } catch { /* depolama kapalı */ }
}

export default function MebExam() {
  const { examId = '', sessionId = '' } = useParams()
  const nav = useNavigate()
  const { profile } = useApp()
  const exam = MEB_EXAMS.find((e) => e.id === examId)
  const session = getMebSession(examId, sessionId)
  const k = storeKey(examId, sessionId)
  const [saved, setSaved] = useState<Saved | null>(() => loadSaved(k))
  const [sheetOpen, setSheetOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(1)
  const [now, setNow] = useState(Date.now())
  const [finished, setFinished] = useState(false)
  const [addingWrong, setAddingWrong] = useState(false)
  const isStudent = profile?.role === 'student'

  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(iv) }, [])
  const onPage = useCallback((n: number) => setPage(n), [])

  if (!exam || !session) return <><PageHeader title="Sınav" back /><Page><Empty emoji="🤷" title="Sınav bulunamadı" /></Page></>

  const start = () => {
    const v: Saved = { answers: Object.fromEntries(session.sections.map((s) => [s.subject, Array(s.key.length).fill(null)])), startedAt: Date.now() }
    save(k, v); setSaved(v); setSheetOpen(false)
  }
  // Durum fonksiyonel güncellenir: hızlı art arda dokunuşlarda işaret kaybolmasın
  const mark = (subject: SubjectId, i: number, letter: string) => setSaved((cur) => {
    if (!cur) return cur
    const arr = [...(cur.answers[subject] ?? [])]
    arr[i] = arr[i] === letter ? null : letter
    const v = { ...cur, answers: { ...cur.answers, [subject]: arr } }
    save(k, v)
    return v
  })

  const left = saved ? session.minutes * 60 - Math.floor(Math.max(0, now - saved.startedAt) / 1000) : session.minutes * 60
  const fmt = (s: number) => `${s < 0 ? '-' : ''}${Math.floor(Math.abs(s) / 60)}:${String(Math.abs(s) % 60).padStart(2, '0')}`
  const answered = saved ? Object.values(saved.answers).flat().filter(Boolean).length : 0
  const total = session.sections.reduce((n, s) => n + s.key.length, 0)

  return (
    <>
      <PageHeader title={`LGS ${exam.year} · ${session.name}`} subtitle={saved ? `⏱️ ${fmt(left)} · ${answered}/${total} işaretlendi` : `${total} soru · ${session.minutes} dakika`} back
        right={<div className="flex gap-1">
          <button className="btn-ghost px-3 py-2" onClick={() => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))} aria-label="Uzaklaştır">−</button>
          <button className="btn-ghost px-3 py-2" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))} aria-label="Yakınlaştır">+</button>
        </div>} />
      <main className="mx-auto max-w-3xl px-2 pb-48">
        {!saved && isStudent && (
          <section className="card mx-2 mb-3 space-y-2 text-sm">
            <p><b>Gerçek sınav gibi çöz:</b> süre başlar, cevaplarını alttaki optik forma işaretle. Bitince uygulama MEB cevap anahtarıyla puanlar ve sonucu Denemeler'e ekler.</p>
            <button className="btn-primary w-full" onClick={start}>▶️ Sınavı başlat ({session.minutes} dk)</button>
          </section>
        )}
        <PdfViewer url={session.url} zoom={zoom} onPage={onPage} />
        <p className="px-2 pt-2 text-center text-xs text-slate-400">Kaynak: MEB ÖDSGM · kitapçık doğrudan MEB sunucusundan gösterilir.</p>
      </main>

      {/* Alt çubuk + optik form */}
      {isStudent && saved && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2">
            <button className="btn-ghost flex-1 py-2.5" onClick={() => setSheetOpen(!sheetOpen)}>📝 Optik form {sheetOpen ? '▾' : '▴'}</button>
            <button className="btn-ghost px-3 py-2.5 text-sm" onClick={() => setAddingWrong(true)}>📸 s.{page}</button>
            <button className="btn-primary px-4 py-2.5" onClick={() => setFinished(true)}>Bitir</button>
          </div>
          {sheetOpen && (
            <div className="mx-auto max-h-[45vh] max-w-3xl overflow-y-auto border-t border-slate-100 px-3 pb-3">
              {session.sections.map((s) => (
                <div key={s.subject} className="pt-2">
                  <div className="sticky top-0 bg-white py-1 text-xs font-extrabold" style={{ color: SUBJECT_META[s.subject].color }}>{SUBJECT_META[s.subject].emoji} {SUBJECT_META[s.subject].name}</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
                    {Array.from({ length: s.key.length }, (_, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="w-6 text-right text-xs font-bold text-slate-400">{i + 1}</span>
                        {LETTERS.map((l) => {
                          const on = saved.answers[s.subject]?.[i] === l
                          return <button key={l} onClick={() => mark(s.subject, i, l)} className={`h-7 w-7 rounded-full border text-xs font-bold ${on ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-500'}`}>{l}</button>
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {finished && saved && <ResultModal examYear={exam.year} examId={examId} sessionId={sessionId} answers={saved.answers} onClose={() => setFinished(false)}
        onSaved={() => { save(k, null); setSaved(null); nav('/denemeler') }} />}
      {addingWrong && <AddPageWrong examId={examId} sessionId={sessionId} page={page} onClose={() => setAddingWrong(false)} />}
    </>
  )
}

function ResultModal({ examYear, examId, sessionId, answers, onClose, onSaved }: {
  examYear: number; examId: string; sessionId: string; answers: Answers; onClose: () => void; onSaved: () => void
}) {
  const { refresh } = useApp()
  const award = useAward()
  const session = getMebSession(examId, sessionId)!
  const [wrongTopics, setWrongTopics] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const graded = useMemo(() => session.sections.map((s) => {
    const a = answers[s.subject] ?? []
    let d = 0, y = 0
    const wrong: number[] = []
    s.key.split('').forEach((correct, i) => {
      if (!a[i]) return
      if (a[i] === correct) d++
      else { y++; wrong.push(i + 1) }
    })
    return { subject: s.subject, d, y, b: s.key.length - d - y, wrong, key: s.key }
  }), [session, answers])

  const results: ExamResults = Object.fromEntries(graded.map((g) => [g.subject, { d: g.d, y: g.y, b: g.b }]))
  const tot = examTotals(results)

  async function saveExam() {
    setBusy(true); setErr(null)
    try {
      await repo.addExam({
        name: `MEB LGS ${examYear} · ${session.name}`, date: today(), source: 'MEB çıkmış sınav', results,
        wrong_topics: wrongTopics, details: { meb: examId, session: sessionId, wrong: Object.fromEntries(graded.map((g) => [g.subject, g.wrong])) },
      })
      await award('exam', XP.examAdded, '· çıkmış sınav')
      await refresh()
      onSaved()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title="Sonuç">
      <div className="space-y-3">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-slate-400"><th className="text-left">Ders</th><th>D</th><th>Y</th><th>B</th><th className="text-right">Net</th></tr></thead>
          <tbody>
            {graded.map((g) => (
              <tr key={g.subject} className="border-t border-slate-50">
                <td className="py-1">{SUBJECT_META[g.subject].emoji} {SUBJECT_META[g.subject].short}</td>
                <td className="text-center text-emerald-600">{g.d}</td><td className="text-center text-rose-600">{g.y}</td><td className="text-center text-slate-400">{g.b}</td>
                <td className="text-right font-bold">{round1(net(g))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="rounded-xl bg-brand-50 p-3 text-center font-extrabold text-brand-700">Bu bölümde toplam net: {tot.total}</div>
        {graded.some((g) => g.wrong.length) && (
          <div className="space-y-1 text-sm">
            <div className="font-bold">Yanlış yaptığın sorular</div>
            {graded.filter((g) => g.wrong.length).map((g) => (
              <div key={g.subject}><b>{SUBJECT_META[g.subject].short}:</b> {g.wrong.map((n) => `${n} (doğrusu ${g.key[n - 1]})`).join(', ')}</div>
            ))}
            <p className="text-xs text-slate-500">İpucu: kitapçıkta o sayfaya gidip alttaki 📸 düğmesiyle sayfayı yanlış bankana ekleyebilirsin.</p>
          </div>
        )}
        <WrongTopicPicker subjects={graded.filter((g) => g.y > 0).map((g) => g.subject)} value={wrongTopics} onChange={setWrongTopics} />
        {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost" onClick={onClose}>Geri dön</button>
          <button className="btn-primary" onClick={saveExam} disabled={busy}>Denemelere kaydet</button>
        </div>
      </div>
    </Modal>
  )
}

function AddPageWrong({ examId, sessionId, page, onClose }: { examId: string; sessionId: string; page: number; onClose: () => void }) {
  const { refresh } = useApp()
  const award = useAward()
  const session = getMebSession(examId, sessionId)!
  const [subject, setSubject] = useState<SubjectId>(session.sections[0].subject)
  const [qno, setQno] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  async function saveIt() {
    setBusy(true)
    try {
      const text = [`LGS ${examId} ${session.name} · ${SUBJECT_META[subject].name}${qno ? ` ${qno}. soru` : ''} (s.${page})`, note.trim()].filter(Boolean).join(' — ')
      await repo.addWrongRef(`meb:${examId}:${sessionId}:${page}`, { subject, topic_id: null, note: text })
      await award('wrong-add', XP.wrongAdded, '· yanlış kaydedildi')
      await refresh()
      onClose()
    } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={`Sayfa ${page} → Yanlış bankası`}>
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {session.sections.map((s) => (
            <button key={s.subject} onClick={() => setSubject(s.subject)} className={`chip py-1.5 ${subject === s.subject ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{SUBJECT_META[s.subject].emoji} {SUBJECT_META[s.subject].short}</button>
          ))}
        </div>
        <input className="input" inputMode="numeric" value={qno} onChange={(e) => setQno(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="Soru numarası (ör. 7)" />
        <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Neden yanlış yaptın? Doğru cevap?" />
        <p className="text-xs text-slate-400">Fotoğraf çekmene gerek yok: kitapçığın bu sayfası tekrar zamanı geldiğinde doğrudan MEB'den açılır.</p>
        <button className="btn-primary w-full" onClick={saveIt} disabled={busy}>Bankaya ekle</button>
      </div>
    </Modal>
  )
}
