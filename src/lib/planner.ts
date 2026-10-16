import type { SubjectId } from '../content/types'
import { SUBJECT_META, getSubject } from './content'
import { addDays, isWeekend } from './dates'
import type { TopicStat } from './stats'
import type { FamilySettings, NewPlanItem } from './types'

// Haftalık program üretici.
// - Ders sırası LGS ağırlığına göre döner (Türkçe/Mat/Fen iki kat sık).
// - Her ders için önce zayıf konular (başarı < %60), sonra müfredat sırasıyla az çalışılmış konular.
// - Her güne yanlış bankası tekrarı; pazar günü deneme.

const ROTATION: SubjectId[] = ['matematik', 'turkce', 'fen', 'inkilap', 'matematik', 'fen', 'turkce', 'ingilizce', 'din']
const BLOCK = 40
const REVIEW_MIN = 15
const EXAM_MIN = 160

export function generateWeek(opts: {
  start: string
  settings: Pick<FamilySettings, 'weekday_minutes' | 'weekend_minutes' | 'school_progress'>
  topicStats: Map<string, TopicStat>
  progress: Map<string, number>
  /** Denemelerde etiketlenen yanlış konular (konu → deneme sayısı) */
  examMisses?: Map<string, number>
}): NewPlanItem[] {
  const { start, settings, topicStats, progress } = opts
  const misses = opts.examMisses ?? new Map<string, number>()
  // Zayıflık puanı: düşük başarı ve denemelerde tekrar eden yanlışlar (her deneme = 15 puan)
  const weakness = (id: string) => {
    const st = topicStats.get(id)
    const acc = st && st.solved >= 5 ? 100 - st.accuracy : 0
    return acc + (misses.get(id) ?? 0) * 15
  }
  const isWeak = (id: string) => {
    const st = topicStats.get(id)
    return (st && st.solved >= 5 && st.accuracy < 60) || (misses.get(id) ?? 0) >= 2
  }
  const used = new Map<string, number>() // konu → bu hafta kaç kez planlandı
  let rot = 0
  const items: NewPlanItem[] = []

  const nextTopic = (subject: SubjectId) => {
    const s = getSubject(subject)
    if (!s) return null
    // Okulda henüz işlenmeyen üniteler programa girmez (ayar yoksa sınırsız)
    const limit = settings.school_progress?.[subject]
    const allowed = s.units.filter((u) => !limit || u.no <= limit).flatMap((u) => u.topics)
    if (!allowed.length) return null
    // Bu hafta en az planlanmış konular arasından seç; hepsi planlandıysa döngü yeniden başlar
    const minUse = Math.min(...allowed.map((t) => used.get(t.id) ?? 0))
    const topics = allowed.filter((t) => (used.get(t.id) ?? 0) === minUse)
    const weak = topics.filter((t) => isWeak(t.id)).sort((a, b) => weakness(b.id) - weakness(a.id))
    if (weak.length) return weak[0]
    // İlerlemesi en düşük konu; eşitlikte müfredatta önce gelen
    return topics.reduce((best, t) => ((progress.get(t.id) ?? 0) < (progress.get(best.id) ?? 0) ? t : best), topics[0])
  }

  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i)
    const weekend = isWeekend(date)
    let budget = weekend ? settings.weekend_minutes : settings.weekday_minutes
    const isSunday = new Date(date + 'T00:00:00').getDay() === 0

    if (isSunday && budget >= EXAM_MIN) {
      items.push({ date, subject: 'genel', topic_id: null, kind: 'deneme', title: 'Tam LGS denemesi (90 soru) çöz ve Denemeler\'e gir', minutes: EXAM_MIN, target_count: 90, done: false })
      budget -= EXAM_MIN
    }
    if (budget >= 45) {
      items.push({ date, subject: 'genel', topic_id: null, kind: 'tekrar', title: 'Yanlış bankası tekrarı', minutes: REVIEW_MIN, target_count: null, done: false })
      budget -= REVIEW_MIN
    }
    let misses = 0
    while (budget >= 25 && misses < ROTATION.length) {
      const subject = ROTATION[rot++ % ROTATION.length]
      const topic = nextTopic(subject)
      if (!topic) { misses++; continue }
      misses = 0
      const repeat = (used.get(topic.id) ?? 0) > 0
      used.set(topic.id, (used.get(topic.id) ?? 0) + 1)
      const prog = progress.get(topic.id) ?? 0
      const minutes = Math.min(BLOCK, budget)
      const learn = prog < 50 && !repeat
      items.push({
        date, subject, topic_id: topic.id, kind: learn ? 'konu' : 'soru',
        title: learn
          ? `${SUBJECT_META[subject].name}: ${topic.name} — konu özeti + alıştırma`
          : `${SUBJECT_META[subject].name}: ${topic.name} — ${subject === 'turkce' || subject === 'matematik' || subject === 'fen' ? 25 : 20} soru çöz`,
        minutes,
        target_count: learn ? topic.questions.length : subject === 'turkce' || subject === 'matematik' || subject === 'fen' ? 25 : 20,
        done: false,
      })
      budget -= minutes
    }
  }
  return items
}
