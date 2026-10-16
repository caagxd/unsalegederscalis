import { useMemo, useState } from 'react'
import { useApp, useData } from '../app/AppProvider'
import { useAward } from '../app/useAward'
import type { Question } from '../content/types'
import { SUBJECT_META, getQuestion } from '../lib/content'
import { repo } from '../lib/db'
import { XP } from '../lib/gamify'
import { buildSession, poolStatus } from '../lib/quizSession'
import { Empty, UnverifiedBadge } from './ui'

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

/** Bir soru havuzundan tekrar etmeyen 10'luk oturumlar çözdürür. Tek konu ya da karma test için. */
export function Quiz({ pool, showTopic = false }: { pool: Question[]; showTopic?: boolean }) {
  const { profile, refresh } = useApp()
  const d = useData()
  const award = useAward()
  const hidden = useMemo(() => new Set(d.reviews.filter((r) => r.status === 'hatali').map((r) => r.question_id)), [d.reviews])
  const visible = useMemo(() => pool.filter((q) => !hidden.has(q.id)), [pool, hidden])
  const status = poolStatus(visible, d.attempts)

  const [session, setSession] = useState<Question[] | null>(null)
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [score, setScore] = useState({ right: 0, wrong: 0 })
  const orders = useMemo(() => (session ?? []).map((q) => choiceOrder(q, getQuestion(q.id)?.ref.subject.id ?? '')), [session])

  const start = (mode: 'smart' | 'all') => {
    setSession(buildSession(visible, d.attempts, mode)); setI(0); setChosen(null); setScore({ right: 0, wrong: 0 })
  }

  if (!visible.length) return <Empty emoji="🧩" title="Burada alıştırma yok" />

  // Başlangıç ekranı: durum + başlat
  if (!session) {
    const todo = status.fresh.length + status.wrong.length
    return (
      <section className="card space-y-3 text-center">
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-slate-50 p-2"><div className="text-xl font-extrabold">{status.fresh.length}</div><div className="text-xs text-slate-500">yeni</div></div>
          <div className="rounded-xl bg-rose-50 p-2"><div className="text-xl font-extrabold text-rose-600">{status.wrong.length}</div><div className="text-xs text-slate-500">tekrar</div></div>
          <div className="rounded-xl bg-emerald-50 p-2"><div className="text-xl font-extrabold text-emerald-600">{status.mastered.length}</div><div className="text-xs text-slate-500">tamam</div></div>
        </div>
        {todo > 0 ? (
          <>
            <button className="btn-primary w-full py-3" onClick={() => start('smart')}>▶️ {Math.min(todo, 10)} soruluk tur başlat</button>
            <p className="text-xs text-slate-500">Doğru çözdüğün sorular tekrar gelmez. Önce yeni sorular, sonra yanlış yaptıkların sorulur.</p>
          </>
        ) : (
          <>
            <div className="text-4xl">🏆</div>
            <p className="font-bold">Buradaki tüm soruları doğru çözdün!</p>
            <button className="btn-ghost w-full" onClick={() => start('all')}>🔁 Karışık tekrar turu</button>
          </>
        )}
      </section>
    )
  }

  if (i >= session.length) {
    return (
      <div className="card animate-pop text-center">
        <div className="text-5xl">{score.right === session.length ? '🏆' : score.right >= session.length / 2 ? '🎉' : '💪'}</div>
        <div className="mt-2 text-2xl font-extrabold">{score.right}/{session.length} doğru</div>
        <p className="mt-1 text-sm text-slate-500">{score.wrong ? 'Yanlışların bir sonraki turda tekrar gelecek. Kitaptan da yanlış yaptıysan fotoğrafını bankaya ekle.' : 'Harika! Bu turu hatasız bitirdin.'}</p>
        <button className="btn-primary mt-4" onClick={() => setSession(null)}>Devam →</button>
      </div>
    )
  }

  const q = session[i]
  const ref = getQuestion(q.id)?.ref
  const subject = ref?.subject.id ?? 'matematik'
  const order = orders[i] ?? [0, 1, 2, 3]
  const reviewed = d.reviews.find((r) => r.question_id === q.id)?.status === 'dogru'

  async function pick(c: number) {
    if (chosen !== null || !ref) return
    setChosen(c)
    const correct = c === q.answer
    setScore((s) => ({ right: s.right + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }))
    if (profile?.role === 'student') {
      await repo.addAttempt({ question_id: q.id, topic_id: ref.topic.id, subject, chosen: c, correct })
      await award('quiz', correct ? XP.quizCorrect : XP.quizWrong, correct ? '· doğru!' : '· emeğine')
    }
  }

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between text-xs font-bold text-slate-400">
        <span>Soru {i + 1}/{session.length} · {'★'.repeat(q.difficulty)}{'☆'.repeat(3 - q.difficulty)}</span>
        {reviewed ? <span className="chip bg-emerald-50 text-emerald-700">✓ kontrol edildi</span> : <UnverifiedBadge />}
      </div>
      {showTopic && ref && <div className="text-xs font-bold" style={{ color: SUBJECT_META[subject].color }}>{ref.topic.name}</div>}
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
          <button className="btn-primary w-full" onClick={async () => { setI(i + 1); setChosen(null); if (i + 1 >= session.length) await refresh() }}>
            {i + 1 < session.length ? 'Sonraki soru →' : 'Sonucu gör'}
          </button>
        </div>
      )}
    </section>
  )
}
