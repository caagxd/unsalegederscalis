import { useState } from 'react'
import { useApp, useData } from '../../app/AppProvider'
import { CreateStudent } from '../../components/CreateStudent'
import { Page, PageHeader } from '../../components/ui'
import { SUBJECT_META, contentStats, subjects } from '../../lib/content'
import { repo } from '../../lib/db'

export default function ParentSettings() {
  const { refresh, celebrate } = useApp()
  const d = useData()
  const [f, setF] = useState({
    exam_date: d.settings.exam_date,
    weekday_minutes: String(d.settings.weekday_minutes),
    weekend_minutes: String(d.settings.weekend_minutes),
  })
  const hasStudent = d.profiles.some((p) => p.role === 'student')
  const cs = contentStats()

  async function save() {
    await repo.updateSettings({
      exam_date: f.exam_date,
      weekday_minutes: Math.max(30, parseInt(f.weekday_minutes, 10) || 90),
      weekend_minutes: Math.max(30, parseInt(f.weekend_minutes, 10) || 180),
    })
    await refresh()
    celebrate('Kaydedildi ✓')
  }

  return (
    <>
      <PageHeader title="Ayarlar" />
      <Page>
        <section className="card space-y-3">
          <h2 className="font-extrabold">Sınav & çalışma süresi</h2>
          <div>
            <label className="label">LGS tarihi</label>
            <input className="input" type="date" value={f.exam_date} onChange={(e) => setF({ ...f, exam_date: e.target.value })} />
            <p className="mt-1 text-xs text-slate-400">2027 tarihi MEB tarafından henüz açıklanmadı. Varsayılan tahmini tarih haziran ortası; açıklanınca güncelleyin.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label">Hafta içi (dk/gün)</label><input className="input" inputMode="numeric" value={f.weekday_minutes} onChange={(e) => setF({ ...f, weekday_minutes: e.target.value.replace(/\D/g, '') })} /></div>
            <div><label className="label">Hafta sonu (dk/gün)</label><input className="input" inputMode="numeric" value={f.weekend_minutes} onChange={(e) => setF({ ...f, weekend_minutes: e.target.value.replace(/\D/g, '') })} /></div>
          </div>
          <p className="text-xs text-slate-400">Program üretici bu süreleri kullanır. Okul + etüt + dershane yükü düşünülerek gerçekçi tutun. Hiç uyulmayan bir program, hiç olmamasından kötüdür.</p>
          <button className="btn-primary w-full" onClick={save}>Kaydet</button>
        </section>

        <SchoolProgress />

        <section className="card space-y-2">
          <h2 className="font-extrabold">Aile</h2>
          <ul className="text-sm">
            {d.profiles.map((p) => <li key={p.id} className="py-1">{p.role === 'student' ? '🎒' : '👤'} {p.display_name} <span className="text-slate-400">· {p.role === 'student' ? 'öğrenci' : 'veli'}</span></li>)}
          </ul>
          {repo.mode === 'supabase' && (
            <p className="rounded-xl bg-slate-50 p-3 text-sm">İkinci veli, kayıt olurken bu <b>aile kodunu</b> girerek aynı paneli görebilir: <code className="ml-1 rounded bg-white px-2 py-0.5 font-mono font-bold">{d.settings.join_code}</code></p>
          )}
        </section>

        {!hasStudent && repo.mode === 'supabase' && <CreateStudent />}

        <section className="card text-sm text-slate-500">
          <h2 className="mb-1 font-extrabold text-slate-900">İçerik</h2>
          {cs.subjects} ders · {cs.units} ünite · {cs.topics} konu · {cs.questions} alıştırma sorusu. İçerik 2026-27 MEB 8. sınıf programına göre hazırlandı.
        </section>

        <button className="btn-ghost w-full" onClick={() => repo.signOut()}>Çıkış yap</button>
      </Page>
    </>
  )
}

// Okulda hangi üniteye gelindiği: program ve karma test bu üniteye kadar olan konuları kullanır.
function SchoolProgress() {
  const { refresh, celebrate } = useApp()
  const d = useData()
  const [sp, setSp] = useState(d.settings.school_progress ?? {})
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    setErr(null)
    try {
      await repo.updateSettings({ school_progress: sp })
      await refresh()
      celebrate('Kaydedildi ✓')
    } catch (e) {
      setErr((e as Error).message.includes('school_progress') ? 'Önce 002 veritabanı güncellemesini çalıştırın (README).' : (e as Error).message)
    }
  }

  return (
    <section className="card space-y-3">
      <h2 className="font-extrabold">🏫 Okulda nereye gelindi?</h2>
      <p className="text-xs text-slate-500">Program ve karma testler yalnızca okulda işlenmiş ünitelerden konu seçer. Okulda yeni üniteye geçildikçe güncelleyin.</p>
      {subjects.map((s) => (
        <div key={s.id} className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-sm font-bold">{SUBJECT_META[s.id].emoji} {SUBJECT_META[s.id].short}</span>
          <select className="input py-2 text-sm" value={sp[s.id] ?? ''}
            onChange={(e) => { const v = e.target.value; const next = { ...sp }; if (v) next[s.id] = Number(v); else delete next[s.id]; setSp(next) }}>
            <option value="">Sınırsız (tüm üniteler)</option>
            {s.units.map((u) => <option key={u.id} value={u.no}>{u.no}. {u.name}</option>)}
          </select>
        </div>
      ))}
      {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
      <button className="btn-primary w-full" onClick={save}>Kaydet</button>
    </section>
  )
}
