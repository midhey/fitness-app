import { useEffect, useState } from 'react'
import { actions, useStore } from '../store/store'
import { programWeek, startForWeek } from '../store/selectors'
import { todayISO } from '../lib/date'
import { toast } from '../lib/toast'
import { TOTAL_WEEKS, WEEKS } from '../data/program'
import { Button, Confirm, cx, Sheet } from './ui'

function Field({ label, value, onChange, suffix, hint }: { label: string; value: string; onChange: (v: string) => void; suffix: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-soft">{label}</span>
      <span className="flex items-baseline rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-line focus-within:ring-accent">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
          inputMode="decimal"
          className="tabular w-full min-w-0 bg-transparent text-lg font-semibold outline-none"
        />
        <span className="text-sm text-mute">{suffix}</span>
      </span>
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3.5 ring-1 ring-line"
    >
      <span className="text-[15px]">{label}</span>
      <span className={cx('relative h-7 w-12 rounded-full transition', checked ? 'bg-accent' : 'bg-white/10')}>
        <span className={cx('absolute top-1 size-5 rounded-full bg-white transition-all', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  )
}

const num = (s: string) => Number(s.replace(',', '.'))
const str = (n: number | null) => (n == null ? '' : String(n).replace('.', ','))

export function ProfileSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useStore((s) => s.profile)
  const settings = useStore((s) => s.settings)
  const today = todayISO()
  const [h, setH] = useState('')
  const [sw, setSw] = useState('')
  const [gw, setGw] = useState('')
  const [iw, setIw] = useState('')
  const [week, setWeek] = useState(1)
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!open) return
    setH(str(profile.heightCm))
    setSw(str(profile.startWeight))
    setGw(str(profile.goalWeight))
    setIw(str(profile.initialWeight))
    setWeek(programWeek(profile, today))
  }, [open, profile, today])

  const valid =
    num(h) >= 120 && num(h) <= 230 && num(sw) >= 40 && num(sw) <= 300 && num(gw) >= 40 && num(gw) < num(sw) && (iw === '' || (num(iw) >= 40 && num(iw) <= 350))

  const save = () => {
    if (!valid) return
    actions.updateProfile({
      heightCm: num(h),
      startWeight: num(sw),
      goalWeight: num(gw),
      initialWeight: iw === '' ? null : num(iw),
      programStart: startForWeek(today, week),
    })
    toast('Профиль сохранён')
    onClose()
  }

  return (
    <>
      <Sheet
        open={open && !confirmReset}
        onClose={onClose}
        title="Профиль и программа"
        footer={
          <Button className="w-full" size="lg" disabled={!valid} onClick={save}>
            Сохранить
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Рост" value={h} onChange={setH} suffix="см" />
            <Field label="Цель" value={gw} onChange={setGw} suffix="кг" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Старт программы" value={sw} onChange={setSw} suffix="кг" />
            <Field label="До снижения" value={iw} onChange={setIw} suffix="кг" hint="≈, можно оставить пустым" />
          </div>

          <div className="pt-2">
            <span className="mb-1.5 block text-sm text-soft">Текущая неделя программы</span>
            <div className="grid grid-cols-8 gap-1.5">
              {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setWeek(n)}
                  aria-pressed={week === n}
                  className={cx(
                    'tabular h-11 rounded-xl text-[15px] font-semibold transition',
                    week === n ? 'bg-accent text-accent-ink' : 'bg-white/[0.05] text-soft',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-mute">
              {WEEKS[week - 1].phase}: {WEEKS[week - 1].summary.toLowerCase()}. Используй, если пропустил неделю или начинаешь цикл заново.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <Toggle label="Звук таймера" checked={settings.sound} onChange={(v) => actions.updateSettings({ sound: v })} />
            <Toggle label="Вибрация" checked={settings.vibration} onChange={(v) => actions.updateSettings({ vibration: v })} />
          </div>

          <div className="pt-4">
            <Button variant="danger" className="w-full" onClick={() => setConfirmReset(true)}>
              Сбросить все данные
            </Button>
            <p className="mt-2 text-xs text-mute">Данные хранятся только в этом браузере (localStorage). Очистка данных браузера тоже удалит их.</p>
          </div>
        </div>
      </Sheet>
      <Confirm
        open={confirmReset}
        title="Сбросить все данные?"
        text="Будут удалены история веса, журнал тренировок, кардио и отметки осанки. Действие нельзя отменить."
        confirmLabel="Сбросить"
        danger
        onConfirm={() => {
          actions.resetAll()
          toast('Данные сброшены')
          onClose()
        }}
        onClose={() => setConfirmReset(false)}
      />
    </>
  )
}
