import { repo } from './db'

// Herkese açık VAPID anahtarı (özel anahtar yalnızca Supabase Edge Function sırlarında durur).
export const VAPID_PUBLIC_KEY = 'BAyHxhfI3JBVvn07zB-U211YWB4743jyUNe5qsAPU8WmplwdGH7Q-wCoc44P1iakqGFYRPekPI0zN7mvwJtGidM'

export type PushState = 'desteklenmiyor' | 'ana-ekran-gerekli' | 'reddedildi' | 'kapali' | 'acik'

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

function urlB64ToUint8Array(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export async function pushState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return isIos() && !isStandalone() ? 'ana-ekran-gerekli' : 'desteklenmiyor'
  }
  if (Notification.permission === 'denied') return 'reddedildi'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub ? 'acik' : 'kapali'
}

export async function enablePush() {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Bildirim izni verilmedi. Telefon ayarlarından bu uygulamaya izin verebilirsin.')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) }))
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await repo.savePushSubscription({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth })
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await repo.deletePushSubscription(sub.endpoint).catch(() => {})
    await sub.unsubscribe()
  }
}
