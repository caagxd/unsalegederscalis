import { useEffect, useState } from 'react'
import { useApp } from '../app/AppProvider'
import { repo } from '../lib/db'
import { disablePush, enablePush, pushState, type PushState } from '../lib/push'

export function NotificationSettings() {
  const { profile } = useApp()
  const [state, setState] = useState<PushState | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const isParent = profile?.role === 'parent'

  useEffect(() => { pushState().then(setState).catch(() => setState('desteklenmiyor')) }, [])

  async function run(fn: () => Promise<void>) {
    setBusy(true); setMsg(null)
    try { await fn() } catch (e) { setMsg({ ok: false, text: (e as Error).message }) } finally {
      setState(await pushState().catch(() => 'desteklenmiyor' as const)); setBusy(false)
    }
  }

  const what = isParent
    ? 'Her pazar akşamı haftalık karne bildirimi gelir.'
    : 'Her akşam 20:00\'de, bitmemiş görevin ya da bekleyen yanlış tekrarın varsa hatırlatma gelir.'

  return (
    <section className="card space-y-2">
      <h2 className="font-extrabold">🔔 Bildirimler</h2>
      <p className="text-sm text-slate-500">{what}</p>
      {repo.mode === 'demo' ? <p className="text-sm text-amber-700">Demo modunda bildirim yok.</p>
        : state === null ? <p className="text-sm text-slate-400">…</p>
        : state === 'ana-ekran-gerekli' ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">iPhone'da bildirim için uygulamayı önce <b>Paylaş → Ana Ekrana Ekle</b> ile kurup oradan açın.</p>
        : state === 'desteklenmiyor' ? <p className="text-sm text-slate-500">Bu tarayıcı bildirimleri desteklemiyor.</p>
        : state === 'reddedildi' ? <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Bildirim izni reddedilmiş. Telefon Ayarları → Bildirimler → LGS'den açabilirsiniz.</p>
        : state === 'acik' ? (
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" disabled={busy} onClick={() => run(async () => setMsg({ ok: true, text: await repo.sendTestPush() }))}>Deneme bildirimi</button>
            <button className="btn-danger" disabled={busy} onClick={() => run(disablePush)}>Kapat</button>
          </div>
        ) : <button className="btn-primary w-full" disabled={busy} onClick={() => run(enablePush)}>Bildirimleri aç</button>}
      {state === 'acik' && <p className="text-xs text-emerald-700">✓ Bu cihazda bildirimler açık.</p>}
      {msg && <p className={`text-sm font-semibold ${msg.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{msg.text}</p>}
    </section>
  )
}
