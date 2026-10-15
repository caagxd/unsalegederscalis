import { NavLink } from 'react-router-dom'

export interface NavItem { to: string; label: string; icon: string; big?: boolean; badge?: number }

export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-end justify-around px-2 pt-1.5">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/' || it.to === '/veli'}
            className={({ isActive }) =>
              `relative flex min-w-[60px] flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-bold ${isActive ? 'text-brand-600' : 'text-slate-400'}`
            }
          >
            {it.big ? (
              <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-2xl text-white shadow-lg shadow-brand-500/40">{it.icon}</span>
            ) : (
              <span className="text-xl leading-none">{it.icon}</span>
            )}
            {it.label}
            {!!it.badge && (
              <span className="absolute right-1 top-0 min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[10px] leading-[18px] text-white">{it.badge}</span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
