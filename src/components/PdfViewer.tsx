import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { openPdf, renderPage } from '../lib/pdf'

// Sayfalar ekrana yaklaştıkça çizilir; görünen sayfa numarası üst bileşene bildirilir.
export function PdfViewer({ url, zoom = 1, onPage }: { url: string; zoom?: number; onPage?: (n: number) => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [ratio, setRatio] = useState(1.414)
  const [width, setWidth] = useState(360)
  const [progress, setProgress] = useState(0)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    openPdf(url, (l, t) => alive && t && setProgress(Math.round((l / t) * 100)))
      .then(async (d) => {
        const p1 = await d.getPage(1)
        const v = p1.getViewport({ scale: 1 })
        if (alive) { setRatio(v.height / v.width); setDoc(d) }
      })
      .catch(() => alive && setErr('PDF yüklenemedi. İnternet bağlantını kontrol et.'))
    return () => { alive = false }
  }, [url])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Görünür sayfayı izle
  useEffect(() => {
    if (!doc || !box.current || !onPage) return
    const io = new IntersectionObserver((entries) => {
      const best = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (best) onPage(Number((best.target as HTMLElement).dataset.page))
    }, { threshold: [0.25, 0.5, 0.75] })
    box.current.querySelectorAll('[data-page]').forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [doc, onPage])

  const pageWidth = Math.round(width * zoom)

  if (err) return <div className="card text-center text-sm text-rose-600">{err}</div>
  return (
    <div ref={box} className="w-full overflow-x-auto">
      {!doc ? (
        <div className="card py-10 text-center text-sm text-slate-500">
          MEB sunucusundan kitapçık indiriliyor… {progress > 0 && `%${progress}`}
          <div className="mx-auto mt-3 h-2 w-48 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} /></div>
        </div>
      ) : (
        <div className="space-y-2" style={{ width: pageWidth }}>
          {Array.from({ length: doc.numPages }, (_, i) => (
            <PdfPage key={i} doc={doc} pageNo={i + 1} width={pageWidth} ratio={ratio} />
          ))}
        </div>
      )}
    </div>
  )
}

function PdfPage({ doc, pageNo, width, ratio }: { doc: PDFDocumentProxy; pageNo: number; width: number; ratio: number }) {
  const holder = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '600px 0px' })
    if (holder.current) io.observe(holder.current)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (visible && canvas.current) renderPage(doc, pageNo, canvas.current, width).catch(() => {})
  }, [visible, doc, pageNo, width])

  return (
    <div ref={holder} data-page={pageNo} className="relative bg-white shadow-sm" style={{ width, height: width * ratio }}>
      {visible && <canvas ref={canvas} />}
      <span className="absolute bottom-1 right-2 rounded bg-slate-900/60 px-1.5 text-[10px] font-bold text-white">{pageNo}</span>
    </div>
  )
}

/** Yanlış bankasındaki "meb:<sınav>:<oturum>:<sayfa>" referansları için tek sayfalık önizleme */
export function PdfPageImage({ url, pageNo, className = '', onClick }: { url: string; pageNo: number; className?: string; onClick?: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const holder = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'yükleniyor' | 'hazır' | 'hata'>('yükleniyor')
  useEffect(() => {
    let alive = true
    openPdf(url).then((d) => {
      if (!alive || !canvas.current || !holder.current) return
      return renderPage(d, pageNo, canvas.current, holder.current.clientWidth || 300).then(() => alive && setState('hazır'))
    }).catch(() => alive && setState('hata'))
    return () => { alive = false }
  }, [url, pageNo])
  return (
    <div ref={holder} className={`relative overflow-hidden bg-slate-100 ${className}`} onClick={onClick}>
      <canvas ref={canvas} className="block w-full" />
      {state !== 'hazır' && <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">{state === 'hata' ? 'sayfa yüklenemedi' : 'MEB kitapçığı yükleniyor…'}</div>}
    </div>
  )
}
