// LGS Hazırlık — bildirim gönderici (Supabase Edge Function, Deno)
//
// mode=daily  : her akşam öğrenciye hatırlatma (bitmemiş görev / bekleyen yanlış tekrarı varsa)
// mode=weekly : pazar akşamı velilere haftalık karne, öğrenciye haftalık özet
// mode=test   : giriş yapmış kullanıcıya deneme bildirimi (uygulamadaki "Deneme bildirimi" düğmesi)
// mode=note   : velinin yazdığı notu ailedeki öğrencinin cihazlarına bildirim olarak gönderir (yalnızca veli)
//
// daily/weekly, pg_cron'dan "x-cron-secret" başlığıyla çağrılır. Gerekli sırlar (Edge Functions → Secrets):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, CRON_SECRET   (SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY otomatik gelir)

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:bildirim@lgs-hazirlik.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// Türkiye saati (UTC+3, yaz saati yok)
const trDate = (offsetDays = 0) => new Date(Date.now() + 3 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10)
const trStartIso = (date: string) => new Date(`${date}T00:00:00+03:00`).toISOString()
const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} sa ${m % 60} dk` : `${m} dk`)

interface Sub { id: string; user_id: string; family_id: string; role: string; endpoint: string; p256dh: string; auth: string }
interface Msg { title: string; body: string; url: string; tag: string }

async function send(subs: Sub[], msg: Msg) {
  let sent = 0
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 6 * 3600 })
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await sb.from('push_subscriptions').delete().eq('id', s.id) // süresi dolmuş abonelik
      else console.error('push hatası', code, (e as Error).message)
    }
  }
  return sent
}

async function familySubs() {
  const { data, error } = await sb.from('push_subscriptions').select('*')
  if (error) throw error
  const byFamily = new Map<string, Sub[]>()
  for (const s of (data ?? []) as Sub[]) byFamily.set(s.family_id, [...(byFamily.get(s.family_id) ?? []), s])
  return byFamily
}

async function daily() {
  const today = trDate()
  let sent = 0
  for (const [fam, subs] of await familySubs()) {
    const students = subs.filter((s) => s.role === 'student')
    if (!students.length) continue
    const [{ data: plan }, { count: due }, { count: xpToday }] = await Promise.all([
      sb.from('plan_items').select('done').eq('family_id', fam).eq('date', today),
      sb.from('wrong_bank').select('id', { count: 'exact', head: true }).eq('family_id', fam).eq('status', 'aktif').lte('next_review', today),
      sb.from('xp_events').select('id', { count: 'exact', head: true }).eq('family_id', fam).gte('created_at', trStartIso(today)),
    ])
    const left = (plan ?? []).filter((p: { done: boolean }) => !p.done).length
    const parts: string[] = []
    if (left) parts.push(`${left} görevin`)
    if (due) parts.push(`${due} yanlış tekrarın`)
    if (!parts.length && xpToday) continue // her şey tamam, rahatsız etme
    const body = parts.length ? `Bugün ${parts.join(' ve ')} bekliyor. Biraz daha gayret! 💪` : 'Bugün henüz çalışmadın. 20 dakika bile fark yaratır. 📚'
    sent += await send(students, { title: 'LGS Hazırlık', body, url: '/', tag: 'gunluk' })
  }
  return sent
}

async function weekly() {
  const end = trDate(), start = trDate(-6)
  const startIso = trStartIso(start)
  let sent = 0
  for (const [fam, subs] of await familySubs()) {
    const [{ data: logs }, { data: attempts }, { data: xp }, { data: exams }, { data: screen }, { data: plan }, { data: rewards }] = await Promise.all([
      sb.from('daily_logs').select('solved,correct,minutes').eq('family_id', fam).gte('date', start).lte('date', end),
      sb.from('quiz_attempts').select('correct').eq('family_id', fam).gte('created_at', startIso),
      sb.from('xp_events').select('created_at,kind').eq('family_id', fam).gte('created_at', startIso),
      sb.from('exams').select('name').eq('family_id', fam).gte('date', start).lte('date', end),
      sb.from('screen_time').select('minutes').eq('family_id', fam).gte('date', start).lte('date', end),
      sb.from('plan_items').select('done').eq('family_id', fam).gte('date', start).lte('date', end),
      sb.from('rewards').select('title,claimed_weeks').eq('family_id', fam).eq('active', true),
    ])
    const solved = (attempts?.length ?? 0) + (logs ?? []).reduce((n: number, l: { solved: number }) => n + l.solved, 0)
    const correct = (attempts ?? []).filter((a: { correct: boolean }) => a.correct).length + (logs ?? []).reduce((n: number, l: { correct: number }) => n + l.correct, 0)
    const minutes = (logs ?? []).reduce((n: number, l: { minutes: number }) => n + l.minutes, 0)
    const days = new Set((xp ?? []).map((e: { created_at: string }) => new Date(new Date(e.created_at).getTime() + 3 * 3600_000).toISOString().slice(0, 10))).size
    const planDone = (plan ?? []).filter((p: { done: boolean }) => p.done).length
    const scr = screen ?? []
    const scrAvg = scr.length ? Math.round(scr.reduce((n: number, s: { minutes: number }) => n + s.minutes, 0) / scr.length) : null

    const lines = [
      `📚 ${solved} soru${solved ? ` · %${Math.round((correct / solved) * 100)} doğru` : ''}`,
      `🔥 ${days}/7 gün çalıştı${minutes ? ` · ${fmtMin(minutes)}` : ''}`,
      plan?.length ? `🗓️ Plan: ${planDone}/${plan.length} görev` : null,
      exams?.length ? `📝 ${exams.length} deneme` : null,
      scrAvg !== null ? `📱 Ekran: günde ort. ${fmtMin(scrAvg)} (${scr.length} gün girildi)` : '📱 Ekran süresi girilmedi',
      rewards?.length ? `🎁 Aktif ödül: ${rewards.map((r: { title: string }) => r.title).join(', ')}` : null,
    ].filter(Boolean).join('\n')

    sent += await send(subs.filter((s) => s.role === 'parent'), { title: 'Haftalık LGS karnesi', body: lines, url: '/veli', tag: 'haftalik' })
    sent += await send(subs.filter((s) => s.role === 'student'),
      { title: 'Haftanın özeti', body: `Bu hafta ${solved} soru çözdün, ${days} gün çalıştın. ${days >= 5 ? 'Harika gidiyorsun! 🏆' : 'Yeni hafta, yeni başlangıç! 💪'}`, url: '/', tag: 'haftalik' })
  }
  return sent
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = new URL(req.url)
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const mode = (body as { mode?: string }).mode ?? url.searchParams.get('mode') ?? ''

    if (mode === 'test' || mode === 'note') {
      const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
      const { data: { user } } = await sb.auth.getUser(jwt)
      if (!user) return json({ message: 'Giriş gerekli' }, 401)

      if (mode === 'note') {
        const { data: me } = await sb.from('profiles').select('family_id, role, display_name').eq('id', user.id).single()
        if (!me || me.role !== 'parent') return json({ message: 'Yalnızca veli bildirim gönderebilir' }, 403)
        const text = String((body as { text?: string }).text ?? '').trim()
        if (!text) return json({ message: 'Boş not' }, 400)
        // Bildirim yağmurunu önle: son bir saatte en fazla 10 not bildirimi
        const { count } = await sb.from('parent_notes').select('id', { count: 'exact', head: true })
          .eq('author_id', user.id).gte('created_at', new Date(Date.now() - 3600_000).toISOString())
        if ((count ?? 0) > 10) return json({ message: 'Çok sık bildirim: bir saat içinde en fazla 10 not gönderilebilir', sent: 0 }, 429)
        const { data: subs } = await sb.from('push_subscriptions').select('*').eq('family_id', me.family_id).eq('role', 'student')
        const body2 = text.length > 180 ? text.slice(0, 177) + '…' : text
        const n = await send((subs ?? []) as Sub[], { title: `💌 ${me.display_name || 'Aileden'} not gönderdi`, body: body2, url: '/', tag: 'not-' + Date.now() })
        return json({ sent: n, message: n ? `Bildirim ${n} cihaza gitti` : 'Not kaydedildi; öğrencinin cihazında bildirim açık değil' })
      }

      const { data } = await sb.from('push_subscriptions').select('*').eq('user_id', user.id)
      const n = await send((data ?? []) as Sub[], { title: 'LGS Hazırlık', body: 'Bildirimler çalışıyor! 🎉', url: '/', tag: 'test' })
      return json({ message: n ? `${n} cihaza deneme bildirimi gönderildi` : 'Bu hesapta kayıtlı cihaz yok' })
    }

    if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return json({ message: 'yetkisiz' }, 401)
    if (mode === 'daily') return json({ sent: await daily() })
    if (mode === 'weekly') return json({ sent: await weekly() })
    return json({ message: 'bilinmeyen mod' }, 400)
  } catch (e) {
    console.error(e)
    return json({ message: (e as Error).message }, 500)
  }
})
