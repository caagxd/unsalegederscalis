import { useState, type FormEvent } from 'react'
import { repo } from '../lib/db'

type Tab = 'ogrenci' | 'veli' | 'kayit'

export default function Login() {
  const [tab, setTab] = useState<Tab>('ogrenci')
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ username: '', pin: '', email: '', password: '', name: '', code: '' })
  const [secondParent, setSecondParent] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function run(fn: () => Promise<void>) {
    setErr(null); setInfo(null); setBusy(true)
    try { await fn() } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (tab === 'ogrenci') run(() => repo.signInStudent(f.username, f.pin))
    else if (tab === 'veli') run(() => repo.signInParent(f.email, f.password))
    else run(async () => {
      // Aile kodu yalnızca "ikinci veli" seçiliyse gönderilir; tarayıcının otomatik doldurması yeni kaydı bozmasın
      const code = secondParent ? f.code.trim().toUpperCase() : ''
      if (secondParent && !/^[0-9A-F]{8}$/.test(code)) throw new Error('Aile kodu 8 karakter olmalı (rakam ve A–F harfleri). Diğer velinin Ayarlar sayfasından kopyalayın.')
      await repo.signUpParent(f.email.trim(), f.password, f.name.trim(), code || undefined)
      setInfo('Hesap oluşturuldu. Giriş yapılmadıysa e-postanızı onaylayıp "Veli" sekmesinden girin.')
    })
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <img src="/icon.svg" alt="" className="mx-auto h-20 w-20" />
        <h1 className="mt-3 text-3xl font-extrabold">LGS Hazırlık</h1>
        <p className="text-slate-500">Her gün biraz, sınavda çok.</p>
      </div>

      {repo.mode === 'demo' ? (
        <div className="space-y-3">
          <button className="btn-primary w-full py-4 text-lg" onClick={() => run(() => repo.signInStudent('', ''))}>🎒 Öğrenci olarak gir</button>
          <button className="btn-ghost w-full py-4 text-lg" onClick={() => run(() => repo.signInParent('', ''))}>👨‍👩‍👧 Veli olarak gir</button>
          <p className="pt-2 text-center text-xs text-slate-400">Demo modunda iki rol de bu cihazdaki aynı verileri görür.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-bold">
            {([['ogrenci', 'Öğrenci'], ['veli', 'Veli'], ['kayit', 'Veli kaydı']] as const).map(([k, l]) => (
              <button key={k} onClick={() => { setTab(k); setErr(null) }} className={`rounded-lg py-2 ${tab === k ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{l}</button>
            ))}
          </div>
          <form onSubmit={submit} className="card space-y-3">
            {tab === 'ogrenci' ? (
              <>
                <div><label className="label">Kullanıcı adı</label><input className="input" autoCapitalize="none" autoComplete="username" value={f.username} onChange={set('username')} required /></div>
                <div><label className="label">PIN (6 hane)</label><input className="input tracking-[0.5em]" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} type="password" autoComplete="current-password" value={f.pin} onChange={set('pin')} required /></div>
              </>
            ) : (
              <>
                {tab === 'kayit' && <div><label className="label">Adınız</label><input className="input" value={f.name} onChange={set('name')} required placeholder="ör. Abi, Anne" /></div>}
                <div><label className="label">E-posta</label><input className="input" type="email" autoComplete="email" value={f.email} onChange={set('email')} required /></div>
                <div><label className="label">Şifre</label><input className="input" type="password" minLength={8} autoComplete={tab === 'kayit' ? 'new-password' : 'current-password'} value={f.password} onChange={set('password')} required /></div>
                {tab === 'kayit' && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                      <input type="checkbox" className="h-4 w-4" checked={secondParent} onChange={(e) => setSecondParent(e.target.checked)} />
                      Ailede zaten bir veli hesabı var, ona katılıyorum
                    </label>
                    {secondParent ? (
                      <div>
                        <label className="label">Aile kodu</label>
                        <input className="input font-mono uppercase tracking-widest" name="lgs-family-code" autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false}
                          maxLength={8} value={f.code} onChange={set('code')} placeholder="ör. 3FA9C21B" />
                        <p className="mt-1 text-xs text-slate-400">Kodu diğer veli, kendi hesabında Ayarlar sayfasında görür.</p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">İlk veli sizseniz işaretlemeyin; yeni bir aile oluşturulur.</p>
                    )}
                  </div>
                )}
              </>
            )}
            {err && <p className="rounded-lg bg-rose-50 p-2 text-sm font-semibold text-rose-600">{err}</p>}
            {info && <p className="rounded-lg bg-emerald-50 p-2 text-sm font-semibold text-emerald-700">{info}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? '…' : tab === 'kayit' ? 'Hesap oluştur' : 'Giriş yap'}</button>
          </form>
          {tab === 'ogrenci' && <p className="mt-4 text-center text-xs text-slate-400">Öğrenci hesabını veli, kendi panelinden oluşturur.</p>}
        </>
      )}
    </div>
  )
}
