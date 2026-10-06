import { ClipboardList, House, PersonStanding, TrendingDown } from 'lucide-react'
import { navigate, type Route } from '../lib/router'
import { cx } from './ui'

const TABS: { route: Route; label: string; icon: typeof House }[] = [
  { route: 'home', label: 'Главная', icon: House },
  { route: 'plan', label: 'План', icon: ClipboardList },
  { route: 'posture', label: 'Осанка', icon: PersonStanding },
  { route: 'progress', label: 'Прогресс', icon: TrendingDown },
]

export function TabBar({ route }: { route: Route }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg">
        {TABS.map(({ route: r, label, icon: Icon }) => {
          const active = r === route
          return (
            <button
              key={r}
              type="button"
              onClick={() => navigate(r, { replace: route !== 'home' })}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                active ? 'text-accent' : 'text-mute',
              )}
            >
              <span className={cx('grid h-7 w-12 place-items-center rounded-full transition', active && 'bg-accent/12')}>
                <Icon size={21} strokeWidth={active ? 2.3 : 1.9} />
              </span>
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
