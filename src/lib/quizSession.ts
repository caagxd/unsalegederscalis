import type { Question } from '../content/types'
import type { QuizAttempt } from './types'

// Alıştırma oturumu: aynı soru tekrar tekrar gelmesin.
// Önce hiç çözülmemiş sorular, sonra son denemesi yanlış olanlar gelir.
// En son doğru çözülen sorular, konu bitene kadar sorulmaz.

export const SESSION_SIZE = 10

export interface PoolStatus { fresh: Question[]; wrong: Question[]; mastered: Question[] }

export function poolStatus(pool: Question[], attempts: QuizAttempt[]): PoolStatus {
  const last = new Map<string, QuizAttempt>()
  for (const a of attempts) {
    const prev = last.get(a.question_id)
    if (!prev || a.created_at > prev.created_at) last.set(a.question_id, a)
  }
  const fresh: Question[] = [], wrong: Question[] = [], mastered: Question[] = []
  for (const q of pool) {
    const l = last.get(q.id)
    if (!l) fresh.push(q)
    else if (l.correct) mastered.push(q)
    else wrong.push(q)
  }
  return { fresh, wrong, mastered }
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1))
    ;[a[k], a[j]] = [a[j], a[k]]
  }
  return a
}

/** Oturum soruları. mode 'all' = konu bittiyse her şeyi karışık yeniden sor. */
export function buildSession(pool: Question[], attempts: QuizAttempt[], mode: 'smart' | 'all' = 'smart', size = SESSION_SIZE) {
  if (mode === 'all') return shuffle(pool).slice(0, size)
  const st = poolStatus(pool, attempts)
  // Yeni sorular kolaydan zora, kendi içinde karışık
  const fresh = shuffle(st.fresh).sort((a, b) => a.difficulty - b.difficulty)
  return [...fresh, ...shuffle(st.wrong)].slice(0, size)
}
