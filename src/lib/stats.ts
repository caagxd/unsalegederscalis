import type { SubjectId } from '../content/types'
import { SUBJECT_IDS, SUBJECT_META, allTopics } from './content'
import { addDays, localDate, today } from './dates'
import type { DailyLog, Exam, ExamResults, QuizAttempt, WrongItem, XpEvent } from './types'

// ── Deneme ──
// LGS'de 3 yanlış 1 doğruyu götürür. Ağırlıklı net: Türkçe/Mat/Fen ×4, diğerleri ×1 (en fazla 270).
export const net = (r?: { d: number; y: number }) => (r ? r.d - r.y / 3 : 0)

export function examTotals(results: ExamResults) {
  let total = 0, weighted = 0
  for (const id of SUBJECT_IDS) {
    const n = net(results[id])
    total += n
    weighted += n * SUBJECT_META[id].weight
  }
  return { total: round1(total), weighted: round1(weighted) }
}

export const round1 = (n: number) => Math.round(n * 10) / 10
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

// ── Günlük aktivite ──
export interface DaySummary { date: string; solved: number; correct: number; wrong: number; minutes: number }

export function daySummaries(logs: DailyLog[], attempts: QuizAttempt[], from: string, to: string): DaySummary[] {
  const map = new Map<string, DaySummary>()
  for (let d = from; d <= to; d = addDays(d, 1)) map.set(d, { date: d, solved: 0, correct: 0, wrong: 0, minutes: 0 })
  for (const l of logs) {
    const s = map.get(l.date); if (!s) continue
    s.solved += l.solved; s.correct += l.correct; s.wrong += l.wrong; s.minutes += l.minutes
  }
  for (const a of attempts) {
    const s = map.get(localDate(a.created_at)); if (!s) continue
    s.solved += 1; if (a.correct) s.correct += 1; else s.wrong += 1
  }
  return [...map.values()]
}

/** Arka arkaya aktif gün sayısı (bugün henüz çalışmadıysa dünden geriye sayar). */
export function streak(xp: XpEvent[]) {
  const days = new Set(xp.map((e) => localDate(e.created_at)))
  let d = days.has(today()) ? today() : addDays(today(), -1)
  let n = 0
  while (days.has(d)) { n++; d = addDays(d, -1) }
  return n
}

// ── Konu bazlı başarı ──
export interface TopicStat { topicId: string; subject: SubjectId; solved: number; correct: number; accuracy: number }

export function topicStats(logs: DailyLog[], attempts: QuizAttempt[]): Map<string, TopicStat> {
  const m = new Map<string, TopicStat>()
  const get = (topicId: string, subject: SubjectId) => {
    let s = m.get(topicId)
    if (!s) m.set(topicId, (s = { topicId, subject, solved: 0, correct: 0, accuracy: 0 }))
    return s
  }
  for (const a of attempts) { const s = get(a.topic_id, a.subject); s.solved++; if (a.correct) s.correct++ }
  for (const l of logs) if (l.topic_id) { const s = get(l.topic_id, l.subject); s.solved += l.solved; s.correct += l.correct }
  for (const s of m.values()) s.accuracy = pct(s.correct, s.solved)
  return m
}

export function subjectStats(logs: DailyLog[], attempts: QuizAttempt[]) {
  const out = Object.fromEntries(SUBJECT_IDS.map((id) => [id, { solved: 0, correct: 0, minutes: 0 }])) as Record<SubjectId, { solved: number; correct: number; minutes: number }>
  for (const a of attempts) { out[a.subject].solved++; if (a.correct) out[a.subject].correct++ }
  for (const l of logs) { out[l.subject].solved += l.solved; out[l.subject].correct += l.correct; out[l.subject].minutes += l.minutes }
  return out
}

/** En zayıf konular: en az 5 soru çözülmüş, başarı oranı en düşük olanlar. */
export function weakestTopics(stats: Map<string, TopicStat>, n = 5) {
  return [...stats.values()].filter((s) => s.solved >= 5).sort((a, b) => a.accuracy - b.accuracy).slice(0, n)
}

/** Konu ilerleme: içerikteki alıştırmalardan kaçı en az bir kez doğru çözüldü. */
export function topicProgress(attempts: QuizAttempt[]) {
  const solvedRight = new Set(attempts.filter((a) => a.correct).map((a) => a.question_id))
  const out = new Map<string, number>()
  for (const { topic } of allTopics()) {
    const done = topic.questions.filter((q) => solvedRight.has(q.id)).length
    out.set(topic.id, pct(done, topic.questions.length))
  }
  return out
}

export function wrongStats(items: WrongItem[]) {
  const active = items.filter((i) => i.status === 'aktif')
  return {
    total: items.length,
    active: active.length,
    learned: items.length - active.length,
    due: active.filter((i) => i.next_review <= today()).length,
  }
}

export function examTrend(exams: Exam[]) {
  return exams.map((e) => ({
    date: e.date, name: e.name, ...examTotals(e.results),
    ...Object.fromEntries(SUBJECT_IDS.map((id) => [id, round1(net(e.results[id]))])),
  }))
}
