import type {
  DailyLog, Exam, FamilySettings, NewDailyLog, NewExam, NewPlanItem, ParentNote, PlanItem,
  Profile, QuestionReview, QuizAttempt, WrongItem, XpEvent,
} from './types'
import type { SubjectId } from '../content/types'

// Uygulamanın tüm veri erişimi bu arayüzden geçer.
// SupabaseRepo (gerçek kullanım) ve LocalRepo (demo modu) aynı sözleşmeyi uygular.
export interface Repo {
  readonly mode: 'supabase' | 'demo'

  // Oturum
  currentProfile(): Promise<Profile | null>
  signInStudent(username: string, pin: string): Promise<void>
  signInParent(email: string, password: string): Promise<void>
  signUpParent(email: string, password: string, name: string, familyCode?: string): Promise<void>
  createStudent(username: string, pin: string, name: string): Promise<void>
  signOut(): Promise<void>
  onAuthChange(cb: () => void): () => void

  familyProfiles(): Promise<Profile[]>
  getSettings(): Promise<FamilySettings>
  updateSettings(patch: Partial<Omit<FamilySettings, 'id' | 'join_code'>>): Promise<void>

  listLogs(sinceDate?: string): Promise<DailyLog[]>
  addLog(log: NewDailyLog): Promise<void>
  deleteLog(id: string): Promise<void>

  listAttempts(sinceDate?: string): Promise<QuizAttempt[]>
  addAttempt(a: { question_id: string; topic_id: string; subject: SubjectId; chosen: number; correct: boolean }): Promise<void>

  listExams(): Promise<Exam[]>
  addExam(e: NewExam): Promise<void>
  deleteExam(id: string): Promise<void>

  listWrong(): Promise<WrongItem[]>
  addWrong(photo: Blob, meta: { subject: SubjectId; topic_id: string | null; note: string | null }): Promise<void>
  updateWrong(id: string, patch: Partial<WrongItem>): Promise<void>
  deleteWrong(item: WrongItem): Promise<void>
  photoUrl(path: string): Promise<string>

  listPlan(from: string, to: string): Promise<PlanItem[]>
  addPlanItems(items: NewPlanItem[]): Promise<void>
  updatePlanItem(id: string, patch: Partial<PlanItem>): Promise<void>
  deletePlanItems(ids: string[]): Promise<void>

  listXp(): Promise<XpEvent[]>
  addXp(kind: string, amount: number): Promise<void>

  listNotes(): Promise<ParentNote[]>
  addNote(text: string): Promise<void>
  markNoteSeen(id: string): Promise<void>
  deleteNote(id: string): Promise<void>

  listReviews(): Promise<QuestionReview[]>
  setReview(questionId: string, status: QuestionReview['status'], note?: string): Promise<void>
}

export const studentEmail = (username: string) =>
  `${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')}@ogrenci.lgs-hazirlik.app`
