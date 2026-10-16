import { useState } from 'react'
import { useApp, useData } from '../app/AppProvider'
import { repo } from '../lib/db'
import type { TopicRef } from '../lib/content'
import { parseYoutubeId } from '../lib/youtube'

// Hazır seçilmiş videolar (src/content/videos.json, bağlantıları YouTube oEmbed ile doğrulanmış)
// + ailenin eklediği videolar + YouTube araması.
const curated = import.meta.glob<{ default: Record<string, { youtubeId: string; title: string; channel: string }[]> }>(
  '../content/videos.json', { eager: true },
)
const CURATED = Object.values(curated)[0]?.default ?? {}

function Embed({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false)
  // Önce küçük resim gösterilir; dokununca oynatıcı yüklenir (mobilde veri ve hız için)
  return play ? (
    <iframe className="aspect-video w-full rounded-xl" src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`} title={title}
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
  ) : (
    <button onClick={() => setPlay(true)} className="relative block aspect-video w-full overflow-hidden rounded-xl bg-slate-900">
      <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-90" loading="lazy" />
      <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-2xl text-white shadow-lg">▶</span></span>
    </button>
  )
}

export function TopicVideos({ refT }: { refT: TopicRef }) {
  const { refresh } = useApp()
  const d = useData()
  const [url, setUrl] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { subject, topic } = refT
  const curatedList = CURATED[topic.id] ?? []
  const family = d.videos.filter((v) => v.topic_id === topic.id && !curatedList.some((c) => c.youtubeId === v.youtube_id))
  const query = encodeURIComponent(`8. sınıf ${subject.name} ${topic.name} konu anlatımı LGS`)

  async function add() {
    const id = parseYoutubeId(url)
    if (!id) return setErr('Geçerli bir YouTube bağlantısı yapıştır')
    setBusy(true); setErr(null)
    try {
      // Başlığı YouTube'dan al (başarısız olursa başlıksız eklenir)
      const title = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`)
        .then((r) => (r.ok ? r.json() : null)).then((j) => j?.title ?? null).catch(() => null)
      await repo.addVideo(topic.id, id, title)
      setUrl('')
      await refresh()
    } catch (e) {
      setErr((e as Error).message.includes('relation') ? 'Video ekleme için 002 veritabanı güncellemesi gerekli (README).' : (e as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-3">
      {curatedList.map((v) => (
        <section key={v.youtubeId} className="card space-y-2 p-3">
          <Embed id={v.youtubeId} title={v.title} />
          <div className="text-sm font-bold leading-snug">{v.title}</div>
          <div className="text-xs text-slate-500">{v.channel}</div>
        </section>
      ))}
      {family.map((v) => (
        <section key={v.id} className="card space-y-2 p-3">
          <Embed id={v.youtube_id} title={v.title ?? 'Video'} />
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-bold leading-snug">{v.title ?? 'Eklenen video'} <span className="chip bg-slate-100 text-slate-500">aile ekledi</span></div>
            <button className="text-xs font-bold text-slate-400" onClick={async () => { if (confirm('Video kaldırılsın mı?')) { await repo.deleteVideo(v.id); await refresh() } }}>Kaldır</button>
          </div>
        </section>
      ))}
      {!curatedList.length && !family.length && <p className="card text-sm text-slate-500">Bu konu için henüz video eklenmedi. Aşağıdan YouTube'da arayıp beğendiğini ekleyebilirsin.</p>}

      <a className="btn w-full bg-red-600 text-white hover:bg-red-700" href={`https://www.youtube.com/results?search_query=${query}`} target="_blank" rel="noreferrer">▶ YouTube'da bu konuyu ara</a>

      <section className="card space-y-2">
        <label className="label">Beğendiğin videoyu bu konuya ekle</label>
        <div className="flex gap-2">
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="YouTube bağlantısını yapıştır" inputMode="url" />
          <button className="btn-primary shrink-0" onClick={add} disabled={busy || !url.trim()}>Ekle</button>
        </div>
        {err && <p className="text-sm font-semibold text-rose-600">{err}</p>}
        <p className="text-xs text-slate-400">Eklenen videoları ailenin tamamı görür.</p>
      </section>
    </div>
  )
}
