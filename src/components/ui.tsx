import { useEffect, useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useBackClose } from '../lib/router'

export function cx(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(' ')
}

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const cls = cx('rounded-3xl bg-card p-4 ring-1 ring-white/[0.045]', className)
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cx(cls, 'block w-full text-left transition active:scale-[0.99]')}>
        {children}
      </button>
    )
  return <div className={cls}>{children}</div>
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  const v: Record<Variant, string> = {
    primary: 'bg-accent text-accent-ink shadow-[0_8px_24px_-10px_rgba(45,212,191,0.7)] disabled:bg-accent/40',
    secondary: 'bg-raised text-ink disabled:opacity-50',
    ghost: 'bg-transparent text-soft',
    danger: 'bg-danger/15 text-danger',
    outline: 'bg-transparent text-ink ring-1 ring-inset ring-line',
  }
  const s = { sm: 'h-9 px-3.5 text-sm rounded-xl', md: 'h-12 px-5 text-[15px] rounded-2xl', lg: 'h-14 px-6 text-base rounded-2xl' }
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 font-semibold transition active:scale-[0.97] disabled:active:scale-100',
        v[variant],
        s[size],
        className,
      )}
    >
      {children}
    </button>
  )
}

export function IconButton({
  label,
  children,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        'grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-soft transition active:scale-95',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Chip({ children, tone = 'default', className = '' }: { children: ReactNode; tone?: 'default' | 'accent' | 'cardio' | 'posture' | 'warn'; className?: string }) {
  const t = {
    default: 'bg-white/[0.06] text-soft',
    accent: 'bg-accent/12 text-accent-strong',
    cardio: 'bg-cardio/12 text-cardio',
    posture: 'bg-posture/12 text-posture',
    warn: 'bg-warn/12 text-warn',
  }
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium', t[tone], className)}>
      {children}
    </span>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-6 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-mute">{children}</h2>
      {action}
    </div>
  )
}

export function ProgressBar({ value, className = '', tone = 'accent' }: { value: number; className?: string; tone?: 'accent' | 'posture' | 'cardio' }) {
  const color = { accent: 'from-teal-500 to-teal-300', posture: 'from-blue-500 to-blue-300', cardio: 'from-orange-500 to-orange-300' }[tone]
  return (
    <div className={cx('h-2 overflow-hidden rounded-full bg-white/[0.07]', className)}>
      <div
        className={cx('h-full rounded-full bg-gradient-to-r transition-[width] duration-500', color)}
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </div>
  )
}

export function Ring({ value, size = 64, stroke = 6, children, color = '#2dd4bf' }: { value: number; size?: number; stroke?: number; children?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.min(1, Math.max(0, value))
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = '',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cx('flex rounded-2xl bg-white/[0.05] p-1', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-9 flex-1 rounded-xl px-2 text-sm font-medium transition',
            o.value === value ? 'bg-raised text-ink shadow-sm' : 'text-mute',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  useBackClose(open, onClose)
  const labelId = useId()
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-labelledby={title ? labelId : undefined}>
      <div className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-sheet relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-surface ring-1 ring-white/[0.06]">
        <div className="flex items-start gap-3 px-5 pb-2 pt-3">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/15" />
          <div id={labelId} className="min-w-0 flex-1 pt-3 text-lg font-semibold leading-snug">
            {title}
          </div>
          <IconButton label="Закрыть" onClick={onClose} className="mt-1.5">
            <X size={18} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <div className="safe-bottom border-t border-white/[0.05] px-5 pb-4 pt-3">{footer}</div>}
        {!footer && <div className="safe-bottom" />}
      </div>
    </div>,
    document.body,
  )
}

export function Confirm({
  open,
  title,
  text,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  text?: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            className="flex-1"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {text && <p className="text-[15px] leading-relaxed text-soft">{text}</p>}
    </Sheet>
  )
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  suffix,
  decimals = 0,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
  decimals?: number
}) {
  const round = (x: number) => Number(x.toFixed(decimals))
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Меньше"
        onClick={() => onChange(round(Math.max(min, value - step)))}
        className="grid size-12 place-items-center rounded-2xl bg-raised text-xl font-semibold text-soft active:scale-95"
      >
        −
      </button>
      <div className="min-w-[88px] flex-1 text-center">
        <span className="tabular text-3xl font-semibold">{value.toFixed(decimals).replace('.', ',')}</span>
        {suffix && <span className="ml-1 text-sm text-mute">{suffix}</span>}
      </div>
      <button
        type="button"
        aria-label="Больше"
        onClick={() => onChange(round(Math.min(max, value + step)))}
        className="grid size-12 place-items-center rounded-2xl bg-raised text-xl font-semibold text-soft active:scale-95"
      >
        +
      </button>
    </div>
  )
}

export function Toast({ text, onDone }: { text: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!text) return
    const t = setTimeout(onDone, 2600)
    return () => clearTimeout(t)
  }, [text, onDone])
  if (!text) return null
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4">
      <div className="animate-fade rounded-2xl bg-raised px-4 py-3 text-sm font-medium text-ink shadow-xl ring-1 ring-white/10">{text}</div>
    </div>,
    document.body,
  )
}
