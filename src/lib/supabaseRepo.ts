import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { addDays, today } from './dates'
import { studentEmail, type Repo } from './repo'
import type { DailyLog, Exam, FamilySettings, ParentNote, PlanItem, Profile, QuestionReview, QuizAttempt, Reward, RewardMetric, ScreenTime, TopicVideo, WrongItem, XpEvent } from './types'

const BUCKET = 'wrong-photos'

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data
}

// Supabase Auth, tetikleyici hatalarının ayrıntısını tarayıcıya göndermez; anlaşılır mesaja çevir
function friendlyAuthError(msg: string, databaseHint?: string) {
  if (/already registered|already exists/i.test(msg)) return 'Bu e-posta ya da kullanıcı adı zaten kayıtlı. Giriş yapmayı deneyin.'
  if (/database error/i.test(msg)) return databaseHint ?? 'Hesap oluşturulamadı (veritabanı hatası). Lütfen tekrar deneyin.'
  if (/password/i.test(msg)) return 'Şifre en az 8 karakter olmalı.'
  if (/rate limit|too many/i.test(msg)) return 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.'
  if (/invalid.*email|email.*invalid/i.test(msg)) return 'E-posta adresi geçersiz.'
  return msg
}

function rows<T>(res: { data: unknown; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message)
  return (res.data ?? []) as T[]
}

export class SupabaseRepo implements Repo {
  readonly mode = 'supabase' as const
  private sb: SupabaseClient
  private profileCache: Profile | null = null
  private urlCache = new Map<string, { url: string; exp: number }>()

  private url: string
  private key: string

  constructor(url: string, key: string) {
    this.url = url
    this.key = key
    this.sb = createClient(url, key)
  }

  async currentProfile() {
    const { data } = await this.sb.auth.getSession()
    const uid = data.session?.user.id
    if (!uid) return (this.profileCache = null)
    if (this.profileCache?.id === uid) return this.profileCache
    const res = await this.sb.from('profiles').select('*').eq('id', uid).maybeSingle()
    return (this.profileCache = check(res) as Profile | null)
  }

  private async familyId() {
    const p = await this.currentProfile()
    if (!p) throw new Error('Oturum yok')
    return p.family_id
  }

  async signInStudent(username: string, pin: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email: studentEmail(username), password: pin })
    if (error) throw new Error('Kullanıcı adı veya PIN hatalı')
  }

  async signInParent(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error('E-posta veya şifre hatalı')
  }

  async signUpParent(email: string, password: string, name: string, familyCode?: string) {
    const { error } = await this.sb.auth.signUp({
      email, password,
      options: { data: { role: 'parent', display_name: name, family_code: familyCode ?? '' } },
    })
    if (error) throw new Error(friendlyAuthError(error.message, familyCode ? 'Aile kodu bulunamadı. Kodu diğer velinin Ayarlar sayfasından tekrar kontrol edin.' : undefined))
  }

  async createStudent(username: string, pin: string, name: string) {
    const settings = await this.getSettings()
    // Ebeveynin oturumunu bozmamak için ayrı, oturum saklamayan bir istemci.
    const temp = createClient(this.url, this.key, {
      auth: { persistSession: false, autoRefreshToken: false, storageKey: 'lgs-temp' },
    })
    const { error } = await temp.auth.signUp({
      email: studentEmail(username), password: pin,
      options: { data: { role: 'student', display_name: name, family_code: settings.join_code } },
    })
    if (error) throw new Error(friendlyAuthError(error.message, 'Öğrenci hesabı oluşturulamadı. Bu ailede zaten bir öğrenci hesabı olabilir.'))
  }

  async signOut() {
    this.profileCache = null
    await this.sb.auth.signOut()
  }

  onAuthChange(cb: () => void) {
    const { data } = this.sb.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') { this.profileCache = null; cb() }
    })
    return () => data.subscription.unsubscribe()
  }

  async familyProfiles() {
    return rows<Profile>(await this.sb.from('profiles').select('*').order('created_at'))
  }

  async getSettings() {
    const row = check(await this.sb.from('families').select('*').eq('id', await this.familyId()).single()) as FamilySettings
    // 002 migrasyonu çalıştırılmadıysa sütun yoktur
    return { ...row, school_progress: row.school_progress ?? {} }
  }

  async updateSettings(patch: Partial<FamilySettings>) {
    check(await this.sb.from('families').update(patch).eq('id', await this.familyId()))
  }

  async listLogs(since?: string) {
    let q = this.sb.from('daily_logs').select('*').order('date', { ascending: false })
    if (since) q = q.gte('date', since)
    return rows<DailyLog>(await q)
  }
  async addLog(log: Parameters<Repo['addLog']>[0]) { check(await this.sb.from('daily_logs').insert(log)) }
  async deleteLog(id: string) { check(await this.sb.from('daily_logs').delete().eq('id', id)) }

  async listAttempts(since?: string) {
    let q = this.sb.from('quiz_attempts').select('*').order('created_at', { ascending: false }).limit(5000)
    if (since) q = q.gte('created_at', since)
    return rows<QuizAttempt>(await q)
  }
  async addAttempt(a: Parameters<Repo['addAttempt']>[0]) { check(await this.sb.from('quiz_attempts').insert(a)) }

  async listExams() { return rows<Exam>(await this.sb.from('exams').select('*').order('date')) }
  async addExam(e: Parameters<Repo['addExam']>[0]) {
    // 003 migrasyonu yoksa da çalışsın: boş ek alanları gönderme
    const { wrong_topics, details, ...base } = e
    const row = { ...base, ...(wrong_topics?.length ? { wrong_topics } : {}), ...(details ? { details } : {}) }
    const res = await this.sb.from('exams').insert(row)
    if (res.error?.message.match(/wrong_topics|details/)) throw new Error('Konu etiketleri için 003 veritabanı güncellemesini çalıştırın (README).')
    check(res)
  }
  async deleteExam(id: string) { check(await this.sb.from('exams').delete().eq('id', id)) }

  async listWrong() { return rows<WrongItem>(await this.sb.from('wrong_bank').select('*').order('created_at', { ascending: false })) }

  async addWrong(photo: Blob, meta: Parameters<Repo['addWrong']>[1]) {
    const path = `${await this.familyId()}/${crypto.randomUUID()}.jpg`
    const up = await this.sb.storage.from(BUCKET).upload(path, photo, { contentType: 'image/jpeg' })
    if (up.error) throw new Error('Fotoğraf yüklenemedi: ' + up.error.message)
    // Tarih istemcide yerel saatle hesaplanır (sunucu UTC'dir).
    check(await this.sb.from('wrong_bank').insert({ ...meta, photo_path: path, next_review: addDays(today(), 1) }))
  }

  async addWrongRef(ref: string, meta: Parameters<Repo['addWrongRef']>[1]) {
    check(await this.sb.from('wrong_bank').insert({ ...meta, photo_path: ref, next_review: addDays(today(), 1) }))
  }

  async listRewards() { return rows<Reward>(await this.sb.from('rewards').select('*').order('created_at')) }
  async addReward(r: { title: string; metric: RewardMetric; target: number }) { check(await this.sb.from('rewards').insert(r)) }
  async updateReward(id: string, patch: Parameters<Repo['updateReward']>[1]) { check(await this.sb.from('rewards').update(patch).eq('id', id)) }
  async deleteReward(id: string) { check(await this.sb.from('rewards').delete().eq('id', id)) }

  async savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }) {
    check(await this.sb.from('push_subscriptions').upsert(sub, { onConflict: 'endpoint' }))
  }
  async sendNotePush(text: string) {
    const { data, error } = await this.sb.functions.invoke('notify', { body: { mode: 'note', text } })
    if (error) {
      // 429 vb. durumlarda gövdedeki mesajı göster
      const msg = await (error as { context?: Response }).context?.json?.().then((j: { message?: string }) => j.message).catch(() => null)
      throw new Error(msg ?? 'Not kaydedildi ama bildirim gönderilemedi')
    }
    return (data as { message?: string })?.message ?? 'Bildirim gönderildi'
  }
  async deletePushSubscription(endpoint: string) { check(await this.sb.from('push_subscriptions').delete().eq('endpoint', endpoint)) }
  async sendTestPush() {
    const { data, error } = await this.sb.functions.invoke('notify', { body: { mode: 'test' } })
    if (error) throw new Error('Bildirim sunucusuna ulaşılamadı. Edge Function kurulumu tamam mı? (README)')
    return (data as { message?: string })?.message ?? 'Gönderildi'
  }

  async updateWrong(id: string, patch: Parameters<Repo['updateWrong']>[1]) {
    check(await this.sb.from('wrong_bank').update(patch).eq('id', id))
  }

  async deleteWrong(item: Parameters<Repo['deleteWrong']>[0]) {
    if (!item.photo_path.startsWith('meb:')) await this.sb.storage.from(BUCKET).remove([item.photo_path])
    check(await this.sb.from('wrong_bank').delete().eq('id', item.id))
  }

  async photoUrl(path: string) {
    if (path.startsWith('meb:')) return path
    const hit = this.urlCache.get(path)
    if (hit && hit.exp > Date.now()) return hit.url
    const { data, error } = await this.sb.storage.from(BUCKET).createSignedUrl(path, 3600)
    if (error) throw new Error(error.message)
    this.urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 })
    return data.signedUrl
  }

  async listPlan(from: string, to: string) {
    return rows<PlanItem>(await this.sb.from('plan_items').select('*').gte('date', from).lte('date', to).order('date').order('created_at'))
  }
  async addPlanItems(items: Parameters<Repo['addPlanItems']>[0]) {
    if (items.length) check(await this.sb.from('plan_items').insert(items))
  }
  async updatePlanItem(id: string, patch: Parameters<Repo['updatePlanItem']>[1]) {
    check(await this.sb.from('plan_items').update(patch).eq('id', id))
  }
  async deletePlanItems(ids: string[]) {
    if (ids.length) check(await this.sb.from('plan_items').delete().in('id', ids))
  }

  async listXp() { return rows<XpEvent>(await this.sb.from('xp_events').select('*').order('created_at')) }
  async addXp(kind: string, amount: number) {
    // Ebeveyn hesabı XP kazanmaz; RLS zaten reddeder, sessizce geç.
    if ((await this.currentProfile())?.role !== 'student') return
    check(await this.sb.from('xp_events').insert({ kind, amount }))
  }

  async listNotes() { return rows<ParentNote>(await this.sb.from('parent_notes').select('*').order('created_at', { ascending: false })) }
  async addNote(text: string) { check(await this.sb.from('parent_notes').insert({ text })) }
  async markNoteSeen(id: string) { check(await this.sb.rpc('mark_note_seen', { note_id: id })) }
  async deleteNote(id: string) { check(await this.sb.from('parent_notes').delete().eq('id', id)) }

  async listReviews() { return rows<QuestionReview>(await this.sb.from('question_reviews').select('question_id,status,note')) }
  async listScreenTime() { return rows<ScreenTime>(await this.sb.from('screen_time').select('*').order('date', { ascending: false }).limit(120)) }

  async saveScreenTime(entry: { date: string; minutes: number; note: string | null }, photo?: Blob) {
    const fam = await this.familyId()
    const existing = (await this.listScreenTime()).find((s) => s.date === entry.date)
    let photo_path = existing?.photo_path ?? null
    if (photo) {
      const path = `${fam}/ekran/${crypto.randomUUID()}.jpg`
      const up = await this.sb.storage.from(BUCKET).upload(path, photo, { contentType: 'image/jpeg' })
      if (up.error) throw new Error('Ekran görüntüsü yüklenemedi: ' + up.error.message)
      if (existing?.photo_path) await this.sb.storage.from(BUCKET).remove([existing.photo_path])
      photo_path = path
    }
    check(await this.sb.from('screen_time').upsert({ ...entry, photo_path }, { onConflict: 'family_id,date' }))
  }

  async deleteScreenTime(item: ScreenTime) {
    if (item.photo_path) await this.sb.storage.from(BUCKET).remove([item.photo_path])
    check(await this.sb.from('screen_time').delete().eq('id', item.id))
  }

  async listVideos() { return rows<TopicVideo>(await this.sb.from('topic_videos').select('*').order('created_at')) }
  async addVideo(topic_id: string, youtube_id: string, title: string | null) {
    check(await this.sb.from('topic_videos').insert({ topic_id, youtube_id, title }))
  }
  async deleteVideo(id: string) { check(await this.sb.from('topic_videos').delete().eq('id', id)) }

  async setReview(question_id: string, status: 'dogru' | 'hatali', note?: string) {
    check(await this.sb.from('question_reviews').upsert({ question_id, status, note: note ?? null, updated_at: new Date().toISOString() }))
  }
}
