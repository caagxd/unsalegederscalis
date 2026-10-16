import type { Question, Subject, SubjectId, Topic, Unit } from '../content/types'

const ORDER: SubjectId[] = ['turkce', 'matematik', 'fen', 'inkilap', 'din', 'ingilizce']

export const SUBJECT_META: Record<SubjectId, { name: string; short: string; count: number; weight: number; color: string; emoji: string }> = {
  turkce: { name: 'Türkçe', short: 'TR', count: 20, weight: 4, color: '#ef4444', emoji: '📖' },
  matematik: { name: 'Matematik', short: 'MAT', count: 20, weight: 4, color: '#3b82f6', emoji: '📐' },
  fen: { name: 'Fen Bilimleri', short: 'FEN', count: 20, weight: 4, color: '#22c55e', emoji: '🔬' },
  inkilap: { name: 'İnkılap Tarihi', short: 'İNK', count: 10, weight: 1, color: '#f59e0b', emoji: '🏛️' },
  din: { name: 'Din Kültürü', short: 'DİN', count: 10, weight: 1, color: '#14b8a6', emoji: '🕌' },
  ingilizce: { name: 'İngilizce', short: 'İNG', count: 10, weight: 1, color: '#a855f7', emoji: '🌍' },
}
export const SUBJECT_IDS = ORDER

const modules = import.meta.glob<{ default: Subject }>(['../content/*.json', '!../content/videos.json'], { eager: true })

export const subjects: Subject[] = ORDER
  .map((id) => Object.values(modules).find((m) => m.default.id === id)?.default)
  .filter((s): s is Subject => !!s)

export interface TopicRef { subject: Subject; unit: Unit; topic: Topic }

const topicIndex = new Map<string, TopicRef>()
const questionIndex = new Map<string, { q: Question; ref: TopicRef }>()
for (const subject of subjects)
  for (const unit of subject.units)
    for (const topic of unit.topics) {
      const ref = { subject, unit, topic }
      topicIndex.set(topic.id, ref)
      for (const q of topic.questions) questionIndex.set(q.id, { q, ref })
    }

export const getTopic = (id: string | null | undefined) => (id ? topicIndex.get(id) : undefined)
export const getQuestion = (id: string) => questionIndex.get(id)
export const getSubject = (id: SubjectId) => subjects.find((s) => s.id === id)
export const allTopics = () => [...topicIndex.values()]
export const allQuestions = () => [...questionIndex.values()]

export const contentStats = () => ({
  subjects: subjects.length,
  units: subjects.reduce((n, s) => n + s.units.length, 0),
  topics: topicIndex.size,
  questions: questionIndex.size,
})
