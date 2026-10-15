import { useState } from 'react'
import { useApp } from '../app/AppProvider'
import { repo } from '../lib/db'

export function CreateStudent() {
  const { refresh } = useApp()
  const [f, setF] = useState({ name: '', username: '', pin: '' })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!/^[a-z0-9._-]{3,}$/i.test(f.username)) return setMsg({ ok: false, text: 'Kullanıcı adı en az 3 karakter olmalı; yalnızca harf, rakam, nokta ve tire kullanılabilir.' })
    if (!/^\d{6}$/.test(f.pin)) return setMsg({ ok: false, text: 'PIN 6 haneli olmalı' })
    setBusy(true)
    try {
      await repo.createStudent(f.username, f.pin, f.name || 'Öğrenci')
      setMsg({ ok: true, text: `Hesap hazır. Telefonunda kullanıcı adı "${f.username.toLowerCase()}" ve PIN ile giriş yapabilir.` })
      await refresh()
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }) } finally { setBusy(false) }
  }

  return (
    <section className="card space-y-3 border-brand-200">
      <h2 className="font-extrabold">🎒 Öğrenci hesabı oluştur</h2>
      <p className="text-sm text-slate-500">Kardeşiniz bu kullanıcı adı ve 6 haneli PIN ile kendi telefonundan giriş yapacak.</p>
      <input className="input" placeholder="Adı (uygulamada görünür)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <input className="input" placeholder="kullanıcı adı" autoCapitalize="none" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        <input className="input tracking-widest" placeholder="PIN" inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => setF({ ...f, pin: e.target.value.replace(/\D/g, '') })} />
      </div>
      {msg && <p className={`rounded-lg p-2 text-sm font-semibold ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>{msg.text}</p>}
      <button className="btn-primary w-full" onClick={create} disabled={busy}>Oluştur</button>
    </section>
  )
}
