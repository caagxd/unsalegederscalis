import { useEffect, useState } from 'react'
import { getMebSession } from '../content/mebExams'
import { repo } from '../lib/db'
import { PdfPageImage } from './PdfViewer'

/** Yanlış bankası görseli: yüklenen fotoğraf ya da MEB kitapçığı sayfası ("meb:<sınav>:<oturum>:<sayfa>") */
export function Photo({ path, className = '', onClick }: { path: string; className?: string; onClick?: () => void }) {
  if (path.startsWith('meb:')) {
    const [, exam, session, page] = path.split(':')
    const s = getMebSession(exam, session)
    if (!s) return <div className={`flex items-center justify-center bg-slate-100 text-xs text-slate-400 ${className}`}>sayfa bulunamadı</div>
    return <PdfPageImage url={s.url} pageNo={Number(page)} className={className} onClick={onClick} />
  }
  return <UploadedPhoto path={path} className={className} onClick={onClick} />
}

function UploadedPhoto({ path, className, onClick }: { path: string; className: string; onClick?: () => void }) {
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
