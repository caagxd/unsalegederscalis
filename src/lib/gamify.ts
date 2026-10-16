import type { DailyLog, Exam, QuizAttempt, WrongItem, XpEvent } from './types'
import { streak } from './stats'

// XP tablosu: emeği ödüllendirir, yalnızca doğruyu değil.
export const XP = {
  quizCorrect: 10,
  quizWrong: 3,
  logPerQuestion: 1, // kitaptan çözülen her soru
  wrongAdded: 5,
  wrongReviewed: 8,
  wrongLearned: 25,
  planDone: 15,
  examAdded: 50,
  topicRead: 5,
  manualDone: 5, // elle eklenen ve tamamlanan çalışma (puan avcılığını önlemek için düşük)
  screenLogged: 5, // ekran süresini dürüstçe girmek
  focusPerTenMin: 5, // çalışma sayacı
} as const

/** Seviye n'e ulaşmak için toplam XP: 50·n·(n-1) → 0, 100, 300, 600, 1000, ... */
export function levelInfo(totalXp: number) {
  let level = 1
  while (50 * (level + 1) * level <= totalXp) level++
  const cur = 50 * level * (level - 1)
  const next = 50 * (level + 1) * level
  return { level, xpInLevel: totalXp - cur, xpForNext: next - cur, title: levelTitle(level) }
}

function levelTitle(l: number) {
  if (l < 3) return 'Çaylak'
  if (l < 6) return 'Azimli'
  if (l < 10) return 'Usta Çırak'
  if (l < 15) return 'Soru Avcısı'
  if (l < 20) return 'LGS Savaşçısı'
  return 'Efsane'
}

export interface Badge { id: string; emoji: string; name: string; desc: string; earned: boolean; progress?: string }

export function badges(d: { xp: XpEvent[]; logs: DailyLog[]; attempts: QuizAttempt[]; wrong: WrongItem[]; exams: Exam[] }): Badge[] {
  const solved = d.attempts.length + d.logs.reduce((n, l) => n + l.solved, 0)
  const s = streak(d.xp)
  const learned = d.wrong.filter((w) => w.status === 'ogrenildi').length
  const reviews = d.wrong.reduce((n, w) => n + w.review_count, 0)
  const b = (id: string, emoji: string, name: string, desc: string, cur: number, goal: number): Badge =>
    ({ id, emoji, name, desc, earned: cur >= goal, progress: `${Math.min(cur, goal)}/${goal}` })
  return [
    b('ilk-adim', '👣', 'İlk Adım', 'İlk sorunu çöz', solved, 1),
    b('yuzluk', '💯', 'Yüzlük', '100 soru çöz', solved, 100),
    b('binlik', '🏔️', 'Binlik', '1000 soru çöz', solved, 1000),
    b('besbin', '🚀', 'Beş Bin', '5000 soru çöz', solved, 5000),
    b('seri-7', '🔥', 'Bir Hafta', '7 gün üst üste çalış', s, 7),
    b('seri-30', '☄️', 'Durdurulamaz', '30 gün üst üste çalış', s, 30),
    b('yanlis-avcisi', '📸', 'Yanlış Avcısı', 'Bankaya 20 yanlış ekle', d.wrong.length, 20),
    b('tekrarci', '🔁', 'Tekrarcı', '50 tekrar yap', reviews, 50),
    b('ogrendim', '🧠', 'Artık Biliyorum', '20 yanlışı öğrenildi yap', learned, 20),
    b('denemeci', '📝', 'Denemeci', '5 deneme gir', d.exams.length, 5),
  ]
}
