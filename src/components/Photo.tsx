import { useEffect, useState } from 'react'
import { repo } from '../lib/db'

export function Photo({ path, className = '', onClick }: { path: string; className?: string; onClick?: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    repo.photoUrl(path).then((u) => alive && setUrl(u)).catch(() => alive && setUrl(''))
    return () => { alive = false }
  }, [path])
  if (url === null) return <div className={`animate-pulse bg-slate-100 ${className}`} />
  if (!url) return <div className={`flex items-center justify-center bg-slate-100 text-xs text-slate-400 ${className}`}>fotoğraf yok</div>
  return <img src={url} alt="Yanlış soru" className={`bg-slate-100 object-cover ${className}`} onClick={onClick} loading="lazy" />
}
