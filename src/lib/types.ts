import type { SubjectId } from '../content/types'

export type Role = 'student' | 'parent'

export interface Profile {
  id: string
  family_id: string
  role: Role
  display_name: string
}

export interface FamilySettings {
  id: string
  join_code: string
  exam_date: string // YYYY-MM-DD
  weekday_minutes: number
  weekend_minutes: number
}

export interface DailyLog {
  id: string
  date: string
  subject: SubjectId
  topic_id: string | null
  solved: number
  correct: number
  wrong: number
  empty: number
  minutes: number
  source: string | null
  created_at: string
}

export interface QuizAttempt {
  id: string
  question_id: string
  topic_id: string
  subject: SubjectId
  chosen: number
  correct: boolean
  created_at: string
}

export type ExamResults = Partial<Record<SubjectId, { d: number; y: number; b: number }>>

export interface Exam {
  id: string
  date: string
  name: string
  source: string | null
  results: ExamResults
  created_at: string
}

export interface WrongItem {
  id: string
  photo_path: string
  subject: SubjectId
  topic_id: string | null
  note: string | null
  next_review: string
  interval_days: number
  success_count: number
  review_count: number
  status: 'aktif' | 'ogrenildi'
  created_at: string
}

export type PlanKind = 'konu' | 'soru' | 'tekrar' | 'deneme'

export interface PlanItem {
  id: string
  date: string
  subject: SubjectId | 'genel'
  topic_id: string | null
  kind: PlanKind
  title: string
  minutes: number
  target_count: number | null
  done: boolean
}

export interface XpEvent {
  id: string
  kind: string
  amount: number
  created_at: string
}

export interface ParentNote {
  id: string
  author_id: string
  text: string
  seen: boolean
  created_at: string
}

export interface QuestionReview {
  question_id: string
  status: 'dogru' | 'hatali'
  note: string | null
}

export type NewDailyLog = Omit<DailyLog, 'id' | 'created_at'>
export type NewExam = Omit<Exam, 'id' | 'created_at'>
export type NewPlanItem = Omit<PlanItem, 'id'>
