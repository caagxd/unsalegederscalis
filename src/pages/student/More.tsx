import { Link } from 'react-router-dom'
import { useApp, useData } from '../../app/AppProvider'
import { ActivityChart } from '../../components/ActivityChart'
import { Page, PageHeader, ProgressBar } from '../../components/ui'
import { repo } from '../../lib/db'
import { localDate, shortDate } from '../../lib/dates'
import { badges, levelInfo } from '../../lib/gamify'
import { pct, streak } from '../../lib/stats'

export default function More() {
  const { profile, refresh } = useApp()
  const d = useData()
  const totalXp = d.xp.reduce((n, e) => n + e.amount, 0)
  const lv = levelInfo(totalXp)
  const bs = badges(d)

  return (
    <>
      <PageHeader title={profile?.display_name ?? 'Ben'} subtitle={`Seviye ${lv.level} · ${lv.title} · ${totalXp} XP`} />
      <Page>
        <section className="card">
          <div className="mb-1 flex justify-between text-sm font-bold"><span>Sonraki seviye</span><span>{lv.xpInLevel}/{lv.xpForNext}</span></div>
          <ProgressBar value={pct(lv.xpInLevel, lv.xpForNext)} color="#f59e0b" />
          <div className="mt-3 text-sm text-slate-500">🔥 {streak(d.xp)} günlük seri</div>
        </section>

        <section className="card">
          <h2 className="mb-3 font-extrabold">Rozetler · {bs.filter((b) => b.earned).length}/{bs.length}</h2>
          <div className="grid grid-cols-3 gap-2">
            {bs.map((b) => (
              <div key={b.id} className={`rounded-xl p-2 text-center ${b.earned ? 'bg-amber-50' : 'bg-slate-50 opacity-50 grayscale'}`} title={b.desc}>
                <div className="text-3xl">{b.emoji}</div>
                <div className="text-xs font-extrabold">{b.name}</div>
                <div className="text-[10px] text-slate-500">{b.earned ? b.desc : b.progress}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="mb-1 font-extrabold">Son 14 gün</h2>
          <ActivityChart logs={d.logs} attempts={d.attempts} />
        </section>

        <nav className="card divide-y divide-slate-100 p-0">
          {[
            ['/program', '🗓️', 'Çalışma programı'],
            ['/cikmis', '🗂️', 'Çıkmış sorular & MEB kaynakları'],
          ].map(([to, e, l]) => (
            <Link key={to} to={to} className="flex items-center gap-3 px-4 py-3.5 font-bold"><span className="text-xl">{e}</span><span className="flex-1">{l}</span><span className="text-slate-300">›</span></Link>
          ))}
        </nav>

        {d.notes.length > 0 && (
          <section className="card">
            <h2 className="mb-2 font-extrabold">💌 Aileden notlar</h2>
            <ul className="space-y-2">
              {d.notes.map((n) => (
                <li key={n.id} className={`rounded-xl p-3 text-sm ${n.seen ? 'bg-slate-50' : 'bg-amber-50'}`}>
                  <p className="whitespace-pre-wrap">{n.text}</p>
                  <div className="mt-1 flex justify-between text-xs text-slate-400">
                    <span>{shortDate(localDate(n.created_at))}</span>
                    {!n.seen && <button className="font-bold text-amber-700" onClick={async () => { await repo.markNoteSeen(n.id); await refresh() }}>Okudum ✓</button>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card text-sm text-slate-600">
          <h2 className="mb-1 font-extrabold text-slate-900">👀 Ailem neyi görüyor?</h2>
          Çözdüğün soru sayılarını, doğruluk oranını, çalışma süreni, deneme netlerini, programdaki işaretlerini ve yanlış bankandaki fotoğrafları görüyorlar.
          Amaç seni yargılamak değil, nerede yardıma ihtiyacın olduğunu birlikte görmek.
        </section>

        <button className="btn-ghost w-full" onClick={() => repo.signOut()}>Çıkış yap</button>
      </Page>
    </>
  )
}
