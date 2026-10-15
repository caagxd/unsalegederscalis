import { Fragment, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export function PageHeader({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="pt-safe sticky top-0 z-20 bg-slate-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-3">
        {back && (
          <button onClick={() => nav(-1)} className="-ml-2 rounded-full p-2 text-xl text-slate-500 hover:bg-slate-200" aria-label="Geri">←</button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold">{title}</h1>
          {subtitle && <p className="truncate text-sm text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  )
}

export const Page = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto max-w-xl space-y-4 px-4 pb-28 pt-1">{children}</main>
)

export function ProgressBar({ value, color = '#4f46e5', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </div>
  )
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="text-xl font-extrabold">{value}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center" onClick={onClose}>
      <div className="pb-safe max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-2xl leading-none text-slate-400 hover:bg-slate-100" aria-label="Kapat">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="card py-10 text-center">
      <div className="text-5xl">{emoji}</div>
      <div className="mt-3 font-bold">{title}</div>
      {children && <div className="mt-1 text-sm text-slate-500">{children}</div>}
    </div>
  )
}

export function UnverifiedBadge() {
  return <span className="chip bg-amber-50 text-amber-700" title="Bu içerik yapay zekâ ile hazırlandı, henüz bir yetişkin tarafından kontrol edilmedi">⚠️ kontrol edilmedi</span>
}

/** Konu özetleri için çok küçük biçimlendirici: **kalın**, "- " madde, boş satır = paragraf */
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/)
  const inline = (s: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') ? <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
    )
  return (
    <div className="space-y-3 leading-relaxed text-slate-700">
      {blocks.map((b, i) => {
        // Bloğu ardışık "madde" ve "düz metin" gruplarına ayır
        const groups: { list: boolean; lines: string[] }[] = []
        for (const l of b.split('\n').filter(Boolean)) {
          const list = /^\s*[-•]\s/.test(l)
          const last = groups[groups.length - 1]
          if (last && last.list === list) last.lines.push(l)
          else groups.push({ list, lines: [l] })
        }
        return (
          <div key={i} className="space-y-1.5">
            {groups.map((g, j) => g.list
              ? <ul key={j} className="list-disc space-y-1 pl-5">{g.lines.map((l, k) => <li key={k}>{inline(l.replace(/^\s*[-•]\s/, ''))}</li>)}</ul>
              : <p key={j}>{g.lines.map((l, k) => <Fragment key={k}>{k > 0 && <br />}{inline(l)}</Fragment>)}</p>)}
          </div>
        )
      })}
    </div>
  )
}
