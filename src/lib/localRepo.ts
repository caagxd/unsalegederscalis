import { addDays, today } from './dates'
import type { Repo } from './repo'
import type { FamilySettings, Profile, Reward, RewardMetric, Role, ScreenTime } from './types'

// Demo modu: Supabase ayarlanmamışken her şey bu cihazda saklanır.
// Tablolar localStorage'da, fotoğraflar IndexedDB'de tutulur.

const PREFIX = 'lgs-demo:'
const FAMILY = 'demo-family'
const PROFILES: Profile[] = [
  { id: 'demo-student', family_id: FAMILY, role: 'student', display_name: 'Öğrenci' },
  { id: 'demo-parent', family_id: FAMILY, role: 'parent', display_name: 'Veli' },
]

type Row = { id: string; created_at: string } & Record<string, unknown>

function read<T>(table: string): T[] {
  try { return JSON.parse(localStorage.getItem(PREFIX + table) ?? '[]') } catch { return [] }
}
function write(table: string, rows: unknown[]) {
  localStorage.setItem(PREFIX + table, JSON.stringify(rows))
}
function insert(table: string, data: object) {
  const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...data }
  write(table, [...read(table), row])
  return row
}
function update(table: string, id: string, patch: object) {
  write(table, read<Row>(table).map((r) => (r.id === id ? { ...r, ...patch } : r)))
}
function remove(table: string, ids: string[]) {
  write(table, read<Row>(table).filter((r) => !ids.includes(r.id)))
}

// ── IndexedDB fotoğraf deposu ──
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('lgs-demo-photos', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('photos')
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function idbOp<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await idb()
  return new Promise((res, rej) => {
    const req = fn(db.transaction('photos', mode).objectStore('photos'))
    req.onsuccess = () => res(req.result as T)
    req.onerror = () => rej(req.error)
  })
}

export class LocalRepo implements Repo {
  readonly mode = 'demo' as const
  private listeners = new Set<() => void>()
  private urls = new Map<string, string>()

  private get role(): Role | null {
    return (localStorage.getItem(PREFIX + 'role') as Role | null) ?? null
  }
  private setRole(r: Role | null) {
    if (r) localStorage.setItem(PREFIX + 'role', r); else localStorage.removeItem(PREFIX + 'role')
    this.listeners.forEach((cb) => cb())
  }

  async currentProfile() { return PROFILES.find((p) => p.role === this.role) ?? null }
  async signInStudent() { this.setRole('student') }
  async signInParent() { this.setRole('parent') }
  async signUpParent() { this.setRole('parent') }
  async createStudent() { /* demo'da öğrenci hazır */ }
  async signOut() { this.setRole(null) }
  onAuthChange(cb: () => void) { this.listeners.add(cb); return () => { this.listeners.delete(cb) } }

  async familyProfiles() { return PROFILES }

  async getSettings(): Promise<FamilySettings> {
    const s = JSON.parse(localStorage.getItem(PREFIX + 'settings') ?? 'null')
    return { id: FAMILY, join_code: 'DEMO1234', exam_date: '2027-06-13', weekday_minutes: 90, weekend_minutes: 180, school_progress: {}, ...s }
  }
  async updateSettings(patch: Partial<FamilySettings>) {
    localStorage.setItem(PREFIX + 'settings', JSON.stringify({ ...(await this.getSettings()), ...patch }))
  }

  async listLogs(since?: string) {
    return read<never>('daily_logs').filter((r: { date: string }) => !since || r.date >= since)
      .sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date))
  }
  async addLog(log: object) { insert('daily_logs', log) }
  async deleteLog(id: string) { remove('daily_logs', [id]) }

  async listAttempts(since?: string) {
    return read<never>('quiz_attempts').filter((r: { created_at: string }) => !since || r.created_at >= since)
  }
  async addAttempt(a: object) { insert('quiz_attempts', a) }

  async listExams() { return read<never>('exams').sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date)) }
  async addExam(e: object) { insert('exams', e) }
  async deleteExam(id: string) { remove('exams', [id]) }

  async listWrong() {
    return read<never>('wrong_bank').sort((a: Row, b: Row) => b.created_at.localeCompare(a.created_at))
  }
  async addWrong(photo: Blob, meta: object) {
    const path = `${FAMILY}/${crypto.randomUUID()}.jpg`
    await idbOp('readwrite', (s) => s.put(photo, path))
    insert('wrong_bank', {
      ...meta, photo_path: path, next_review: addDays(today(), 1), interval_days: 1,
      success_count: 0, review_count: 0, status: 'aktif',
    })
  }
  async addWrongRef(ref: string, meta: object) {
    insert('wrong_bank', { ...meta, photo_path: ref, next_review: addDays(today(), 1), interval_days: 1, success_count: 0, review_count: 0, status: 'aktif' })
  }
  async updateWrong(id: string, patch: object) { update('wrong_bank', id, patch) }

  async listRewards() { return read<Reward>('rewards') }
  async addReward(r: { title: string; metric: RewardMetric; target: number }) { insert('rewards', { ...r, active: true, claimed_weeks: [] }) }
  async updateReward(id: string, patch: object) { update('rewards', id, patch) }
  async deleteReward(id: string) { remove('rewards', [id]) }

  async savePushSubscription() { throw new Error('Bildirimler demo modunda çalışmaz') }
  async deletePushSubscription() { /* demo */ }
  async sendTestPush(): Promise<string> { throw new Error('Bildirimler demo modunda çalışmaz') }
  async deleteWrong(item: { id: string; photo_path: string }) {
    if (!item.photo_path.startsWith('meb:')) await idbOp('readwrite', (s) => s.delete(item.photo_path))
    remove('wrong_bank', [item.id])
  }
  async photoUrl(path: string) {
    if (path.startsWith('meb:')) return path
    const hit = this.urls.get(path)
    if (hit) return hit
    const blob = await idbOp<Blob | undefined>('readonly', (s) => s.get(path))
    if (!blob) return ''
    const url = URL.createObjectURL(blob)
    this.urls.set(path, url)
    return url
  }

  async listPlan(from: string, to: string) {
    return read<never>('plan_items').filter((r: { date: string }) => r.date >= from && r.date <= to)
      .sort((a: Row & { date: string }, b: Row & { date: string }) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at))
  }
  async addPlanItems(items: object[]) { items.forEach((i) => insert('plan_items', i)) }
  async updatePlanItem(id: string, patch: object) { update('plan_items', id, patch) }
  async deletePlanItems(ids: string[]) { remove('plan_items', ids) }

  async listXp() { return read<never>('xp_events') }
  async addXp(kind: string, amount: number) { if (this.role === 'student') insert('xp_events', { kind, amount }) }

  async listNotes() { return read<never>('parent_notes').sort((a: Row, b: Row) => b.created_at.localeCompare(a.created_at)) }
  async addNote(text: string) { insert('parent_notes', { text, author_id: 'demo-parent', seen: false }) }
  async markNoteSeen(id: string) { update('parent_notes', id, { seen: true }) }
  async deleteNote(id: string) { remove('parent_notes', [id]) }

  async listScreenTime() {
    return read<ScreenTime>('screen_time').sort((a, b) => b.date.localeCompare(a.date))
  }
  async saveScreenTime(entry: { date: string; minutes: number; note: string | null }, photo?: Blob) {
    const existing = read<ScreenTime>('screen_time').find((s) => s.date === entry.date)
    let photo_path = existing?.photo_path ?? null
    if (photo) {
      photo_path = `${FAMILY}/ekran/${crypto.randomUUID()}.jpg`
      await idbOp('readwrite', (s) => s.put(photo, photo_path!))
      if (existing?.photo_path) await idbOp('readwrite', (s) => s.delete(existing.photo_path!))
    }
    if (existing) update('screen_time', existing.id, { ...entry, photo_path })
    else insert('screen_time', { ...entry, photo_path })
  }
  async deleteScreenTime(item: ScreenTime) {
    if (item.photo_path) await idbOp('readwrite', (s) => s.delete(item.photo_path!))
    remove('screen_time', [item.id])
  }

  async listVideos() { return read<never>('topic_videos') }
  async addVideo(topic_id: string, youtube_id: string, title: string | null) {
    if (read<{ topic_id: string; youtube_id: string }>('topic_videos').some((v) => v.topic_id === topic_id && v.youtube_id === youtube_id)) return
    insert('topic_videos', { topic_id, youtube_id, title, added_by: this.role === 'parent' ? 'demo-parent' : 'demo-student' })
  }
  async deleteVideo(id: string) { remove('topic_videos', [id]) }

  async listReviews() { return read<never>('question_reviews') }
  async setReview(question_id: string, status: string, note?: string) {
    const rows = read<{ question_id: string }>('question_reviews').filter((r) => r.question_id !== question_id)
    write('question_reviews', [...rows, { question_id, status, note: note ?? null }])
  }
}
