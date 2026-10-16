import { useMemo, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp, useData } from '../app/AppProvider'
import { useAward } from '../app/useAward'
import { Photo } from '../components/Photo'
import { Empty, Modal, Page, PageHeader, Stat } from '../components/ui'
import { repo } from '../lib/db'
import { addDays, dayName, fmtMinutes, shortDate, today } from '../lib/dates'
import { XP } from '../lib/gamify'
import { compressImage } from '../lib/image'
import type { ScreenTime } from '../lib/types'

const GOAL = 120 // günlük hedef üst sınır (dk)

// Öğrenci girer, veli görür. Telefonun kendi "Ekran Süresi" / "Dijital Denge" ekranının görüntüsü kanıt olarak eklenir.
export default function ScreenTimePage() {
  const { profile } = useApp()
  const d = useData()
  const isStudent = profile?.role === 'student'
  const [editing, setEditing] = useState<string | null>(null)
  const [viewing, setViewing] = useState<ScreenTime | null>(null)

  const byDate = useMemo(() => new Map(d.screenTime.map((s) => [s.date, s])), [d.screenTime])
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13))
  const chart = last14.map((date) => ({ label: shortDate(date), minutes: byDate.get(date)?.minutes ?? 0, has: byDate.has(date) }))
  const week = last14.slice(7).map((x) => byDate.get(x)).filter((x): x is ScreenTime => !!x)
  const avg = week.length ? Math.round(week.reduce((n, s) => n + s.minutes, 0) / week.length) : 0
  const missing = last14.slice(7).filter((x) => x < today() && !byDate.has(x)).length

  return (
    <>
      <PageHeader title="Ekran Süresi" subtitle="Günlük telefon kullanımı" back />
      <Page>
        {isStudent && (
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-primary py-3" onClick={() => setEditing(today())}>📱 Bugünü gir</button>
            <button className="btn-ghost py-3" onClick={() => setEditing(addDays(today(), -1))}>Dünü gir</button>
          </div>
        )}

        <section className="card">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Bugün" value={byDate.get(today()) ? fmtMinutes(byDate.get(today())!.minutes) : '–'} />
            <Stat label="7 gün ort." value={week.length ? fmtMinutes(avg) : '–'} />
            <Stat label="Eksik gün" value={missing} hint="son 7 gün" />
          </div>
          <div className="mt-3">
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={chart} margin={{ left: -24, right: 4, top: 8 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 60)}s`} />
                <Tooltip formatter={(v) => [fmtMinutes(Number(v)), 'Ekran süresi']} />
                <ReferenceLine y={GOAL} stroke="#f59e0b" strokeDasharray="4 4" />
                <Bar dataKey="minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400">Kesikli çizgi: günlük {GOAL / 60} saat hedefi.</p>
          </div>
        </section>

        {isStudent && (
          <section className="card text-sm text-slate-600">
            <b>Nereden bakılır?</b> iPhone: Ayarlar → Ekran Süresi → Tüm Etkinliği Gör. Android: Ayarlar → Dijital Denge. O ekranın görüntüsünü alıp buraya ekle.
          </section>
        )}

        {d.screenTime.length === 0 ? <Empty emoji="📱" title="Henüz kayıt yok">{isStudent ? 'Her akşam günün ekran süresini gir.' : 'Öğrenci girdikçe burada görünecek.'}</Empty> : (
          <ul className="space-y-2">
            {d.screenTime.slice(0, 30).map((s) => (
              <li key={s.id}>
                <button className="card flex w-full items-center gap-3 text-left" onClick={() => setViewing(s)}>
                  {s.photo_path ? <Photo path={s.photo_path} className="h-14 w-14 shrink-0 rounded-lg" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">görsel yok</div>}
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{dayName(s.date)} · {shortDate(s.date)}</div>
                    {s.note && <div className="truncate text-xs text-slate-500">{s.note}</div>}
                  </div>
                  <span className={`text-lg font-extrabold ${s.minutes > GOAL ? 'text-rose-600' : 'text-emerald-600'}`}>{fmtMinutes(s.minutes)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Page>

      {editing && <EntryModal date={editing} existing={byDate.get(editing)} onClose={() => setEditing(null)} />}
      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={`${dayName(viewing.date)} · ${fmtMinutes(viewing.minutes)}`}>
          {viewing.photo_path && <Photo path={viewing.photo_path} className="w-full rounded-xl" />}
          {viewing.note && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">{viewing.note}</p>}
          {isStudent && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={() => { setEditing(viewing.date); setViewing(null) }}>Düzenle</button>
              <DeleteButton item={viewing} onDone={() => setViewing(null)} />
            </div>
          )}
        </Modal>
      )}
    </>
  )
}

function DeleteButton({ item, onDone }: { item: ScreenTime; onDone: () => void }) {
  const { refresh } = useApp()
  return <button className="btn-danger" onClick={async () => { if (confirm('Bu kayıt silinsin mi?')) { await repo.deleteScreenTime(item); await refresh(); onDone() } }}>Sil</button>
}

function EntryModal({ date, existing, onClose }: { date: string; existing?: ScreenTime; onClose: () => void }) {
  const { refresh } = useApp()
  const award = useAward()
  const fileRef = useRef<HTMLInputElement>(null)
  const [h, setH] = useState(existing ? String(Math.floor(existing.minutes / 60)) : '')
  const [m, setM] = useState(existing ? String(existing.minutes % 60) : '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [file, setFile] = useState<File | null>(null)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save() {
    const minutes = (parseInt(h || '0', 10) || 0) * 60 + (parseInt(m || '0', 10) || 0)
    if (minutes > 1440) return setErr('Bir günde en fazla 24 saat olabilir')
    if (!file && !existing?.photo_path) return setErr('Ekran Süresi ekranının görüntüsünü ekle')
    setBusy(true); setErr(null)
    try {
      await repo.saveScreenTime({ date, minutes, note: note.trim() || null }, file ? await compressImage(file) : undefined)
      if (!existing) await award('screen', XP.screenLogged, '· dürüstlük puanı')
      await refresh()
      onClose()
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  return (
    <Modal open onClose={onClose} title={`${dayName(date)} ekran süresi`}>
      <div className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1"><label className="label">Saat</label><input className="input text-center text-lg font-bold" inputMode="numeric" value={h} onChange={(e) => setH(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="0" /></div>
          <div className="flex-1"><label className="label">Dakika</label><input className="input text-center text-lg font-bold" inputMode="numeric" value={m} onChange={(e) => setM(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="0" /></div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = '' }} />
        {preview ? <img src={preview} alt="" className="max-h-64 w-full rounded-xl bg-slate-100 object-contain" />
          : existing?.photo_path ? <Photo path={existing.photo_path} className="max-h-64 w-full rounded-xl object-contain" /> : null}
        <button className="btn-ghost w-full" onClick={() => fileRef.current?.click()}>🖼️ {preview || existing?.photo_path ? 'Görüntüyü değiştir' : 'Ekran görüntüsü ekle'}</button>
        <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not (isteğe bağlı): ör. çoğu ödev araştırması için" />
        {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
        <button className="btn-primary w-full" onClick={save} disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </div>
    </Modal>
  )
}
