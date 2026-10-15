import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApp, useData } from '../../app/AppProvider'
import { useAward } from '../../app/useAward'
import { LogModal } from '../../components/LogModal'
import { Empty, Page, PageHeader, RichText, UnverifiedBadge } from '../../components/ui'
import type { Question } from '../../content/types'
import { SUBJECT_META, getTopic } from '../../lib/content'
import { repo } from '../../lib/db'
import { XP } from '../../lib/gamify'

const LETTERS = ['A', 'B', 'C', 'D']

// İçerikte doğru cevaplar şıklara düzenli dağıldığı için şıklar her gösterimde karıştırılır.
// Açıklamasında tek başına duran A–D harfi geçen sorular ("B'de", "A ve D", "C metni" gibi
// şık atıfları olabilir) sabit sırada kalır; aksi hâlde açıklama yanlış harfi gösterirdi.
// Türkçede bu harfler yalnızca şık atfıdır; şıklar yine karıştırılır ve açıklamadaki harfler yeniden yazılır.
const LETTER_REF = /(^|[^\p{L}\p{N}])([A-D])(?![\p{L}\p{N}])(['’][a-zçğıöşü]+)?/gmu
// Harf değişince ekin ünlüsü de uymalı: "B'de" → "A'da", "A'nın" → "C'nin"
const BACK: Record<string, string> = { e: 'a', i: 'ı', ü: 'u', ö: 'o' }
const FRONT: Record<string, string> = { a: 'e', ı: 'i', u: 'ü', o: 'ö' }
const harmonize = (letter: string, suffix = '') =>
  suffix.replace(/[aeıioöuü]/g, (v) => (letter === 'A' ? BACK[v] : FRONT[v]) ?? v)
const REFERS_LETTER = /(^|[^\p{L}\p{N}])[A-D](?![\p{L}\p{N}])/mu
const REMAP_SUBJECTS = new Set(['turkce'])

function choiceOrder(q: Question, subject: string): number[] {
  const order = [0, 1, 2, 3]
  if (!REMAP_SUBJECTS.has(subject) && REFERS_LETTER.test(q.explanation)) return order
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1))
    ;[order[k], order[j]] = [order[j], order[k]]
  }
  return order
}

/** Açıklamadaki şık harflerini ekrandaki yeni sıraya çevirir */
function remapExplanation(text: string, order: number[], subject: string) {
  if (!REMAP_SUBJECTS.has(subject)) return text
  return text.replace(LETTER_REF, (_, pre: string, l: string, suffix?: string) => {
    const next = LETTERS[order.indexOf(LETTERS.indexOf(l))]
    return pre + next + harmonize(next, suffix)
  })
}

export default function TopicPage() {
  const { topicId } = useParams()
  const ref = getTopic(topicId)
  const [tab, setTab] = useState<'konu' | 'test'>('konu')
  const [logOpen, setLogOpen] = useState(false)
  if (!ref) return <><PageHeader title="Konu" back /><Page><Empty emoji="🤷" title="Konu bulunamadı" /></Page></>
  const { subject, unit, topic } = ref
  const m = SUBJECT_META[subject.id]

  return (
    <>
      <PageHeader title={topic.name} subtitle={`${m.emoji} ${subject.name} · ${unit.name}`} back />
      <Page>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-bold">
          <button onClick={() => setTab('konu')} className={`rounded-lg py-2 ${tab === 'konu' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>📘 Konu anlatımı</button>
          <button onClick={() => setTab('test')} className={`rounded-lg py-2 ${tab === 'test' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>✏️ Alıştırma ({topic.questions.length})</button>
        </div>

        {tab === 'konu' ? (
          <>
            <section className="card space-y-3">
              <div className="flex flex-wrap gap-1">{!topic.questions.every((q) => q.verified) && <UnverifiedBadge />}</div>
              <RichText text={topic.summary} />
            </section>
            {topic.keyPoints.length > 0 && (
              <section className="card border-brand-100 bg-brand-50">
                <h3 className="mb-2 font-extrabold text-brand-700">🔑 Akılda tut</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm">{topic.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
              </section>
            )}
            {topic.commonMistakes.length > 0 && (
              <section className="card border-rose-100 bg-rose-50">
                <h3 className="mb-2 font-extrabold text-rose-700">⚠️ Sık yapılan hatalar</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm">{topic.commonMistakes.map((k, i) => <li key={i}>{k}</li>)}</ul>
              </section>
            )}
            {topic.kazanim.length > 0 && (
              <details className="card text-sm">
                <summary className="cursor-pointer font-bold text-slate-500">MEB kazanımları</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">{topic.kazanim.map((k, i) => <li key={i}>{k}</li>)}</ul>
              </details>
            )}
            <button className="btn-primary w-full" onClick={() => setTab('test')}>Alıştırmaya geç →</button>
          </>
        ) : (
          <Quiz key={topic.id} questions={topic.questions} topicId={topic.id} subject={subject.id} />
        )}

        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost text-sm" onClick={() => setLogOpen(true)}>➕ Kitaptan çözdüklerim</button>
          <Link to={`/yanlislar?konu=${topic.id}`} className="btn-ghost text-sm">📸 Yanlış ekle</Link>
        </div>
      </Page>
      {logOpen && <LogModal open onClose={() => setLogOpen(false)} preset={{ subject: subject.id, topicId: topic.id }} />}
    </>
  )
}

function Quiz({ questions, topicId, subject }: { questions: Question[]; topicId: string; subject: Parameters<typeof repo.addAttempt>[0]['subject'] }) {
  const { profile, refresh } = useApp()
  const d = useData()
  const award = useAward()
  const hidden = useMemo(() => new Set(d.reviews.filter((r) => r.status === 'hatali').map((r) => r.question_id)), [d.reviews])
  const qs = questions.filter((q) => !hidden.has(q.id))
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [score, setScore] = useState({ right: 0, wrong: 0 })
  const [round, setRound] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const orders = useMemo(() => qs.map((q) => choiceOrder(q, subject)), [qs.length, round])

  if (!qs.length) return <Empty emoji="🧩" title="Bu konuda alıştırma yok" />
  if (i >= qs.length) {
    return (
      <div className="card animate-pop text-center">
        <div className="text-5xl">{score.right === qs.length ? '🏆' : score.right >= qs.length / 2 ? '🎉' : '💪'}</div>
        <div className="mt-2 text-2xl font-extrabold">{score.right}/{qs.length} doğru</div>
        <p className="mt-1 text-sm text-slate-500">{score.wrong ? 'Yanlışlarının çözümünü tekrar oku. Kitaptan da yanlış yaptıysan fotoğrafını bankaya ekle.' : 'Harika! Bu konuyu kitaptan bol soruyla pekiştir.'}</p>
        <button className="btn-primary mt-4" onClick={() => { setI(0); setChosen(null); setScore({ right: 0, wrong: 0 }); setRound((r) => r + 1) }}>Tekrar çöz</button>
      </div>
    )
  }

  const q = qs[i]
  const order = orders[i] ?? [0, 1, 2, 3]
  const reviewed = d.reviews.find((r) => r.question_id === q.id)?.status === 'dogru'

  async function pick(c: number) {
    if (chosen !== null) return
    setChosen(c)
    const correct = c === q.answer
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }))
    if (profile?.role === 'student') {
      await repo.addAttempt({ question_id: q.id, topic_id: topicId, subject, chosen: c, correct })
      await award('quiz', correct ? XP.quizCorrect : XP.quizWrong, correct ? '· doğru!' : '· emeğine')
    }
  }

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
        <span>Soru {i + 1}/{qs.length} · {'★'.repeat(q.difficulty)}{'☆'.repeat(3 - q.difficulty)}</span>
        {reviewed ? <span className="chip bg-emerald-50 text-emerald-700">✓ kontrol edildi</span> : <UnverifiedBadge />}
      </div>
      <p className="whitespace-pre-wrap font-semibold leading-relaxed">{q.stem}</p>
      <div className="space-y-2">
        {order.map((k, pos) => {
          const c = q.choices[k]
          const state = chosen === null ? '' : k === q.answer ? 'border-emerald-500 bg-emerald-50' : k === chosen ? 'border-rose-500 bg-rose-50' : 'opacity-60'
          return (
            <button key={k} onClick={() => pick(k)} className={`flex w-full items-start gap-3 rounded-xl border-2 border-slate-100 p-3 text-left transition ${state}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-extrabold">{LETTERS[pos]}</span>
              <span className="pt-0.5">{c}</span>
            </button>
          )
        })}
      </div>
      {chosen !== null && (
        <div className="animate-pop space-y-3">
          <div className={`rounded-xl p-3 ${chosen === q.answer ? 'bg-emerald-50' : 'bg-rose-50'}`}>
            <div className="font-extrabold">{chosen === q.answer ? '✅ Doğru!' : `❌ Doğru cevap: ${LETTERS[order.indexOf(q.answer)]}`}</div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{remapExplanation(q.explanation, order, subject)}</p>
          </div>
          <button className="btn-primary w-full" onClick={async () => { setI(i + 1); setChosen(null); if (i + 1 >= qs.length) await refresh() }}>
            {i + 1 < qs.length ? 'Sonraki soru →' : 'Sonucu gör'}
          </button>
        </div>
      )}
    </section>
  )
}
