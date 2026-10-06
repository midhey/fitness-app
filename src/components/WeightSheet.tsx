import { useEffect, useState } from 'react'
import { actions, useStore } from '../store/store'
import { latestWeight } from '../store/selectors'
import { todayISO } from '../lib/date'
import { toast } from '../lib/toast'
import { Button, Sheet } from './ui'

export function WeightSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const weights = useStore((s) => s.weights)
  const last = latestWeight(weights)
  const [text, setText] = useState('')
  const [date, setDate] = useState(todayISO())

  useEffect(() => {
    if (open) {
      setText(last ? String(last.kg).replace('.', ',') : '')
      setDate(todayISO())
    }
  }, [open])

  const kg = Number(text.replace(',', '.'))
  const valid = Number.isFinite(kg) && kg >= 40 && kg <= 300
  const existing = weights.find((w) => w.date === date)

  const bump = (d: number) => {
    const base = Number.isFinite(kg) && kg > 0 ? kg : (last?.kg ?? 116)
    setText(String(Math.round((base + d) * 10) / 10).replace('.', ','))
  }

  const save = () => {
    if (!valid) return
    actions.saveWeight(date, Math.round(kg * 10) / 10)
    toast('Вес сохранён')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Записать вес"
      footer={
        <Button className="w-full" size="lg" disabled={!valid} onClick={save}>
          {existing ? 'Заменить запись' : 'Сохранить'}
        </Button>
      }
    >
      <p className="mb-4 text-sm text-mute">Взвешивайся в одно время — утром, после туалета, до еды. Для оценки темпа важна динамика за 1–2 недели, а не отдельный день.</p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => bump(-0.1)} className="grid size-14 place-items-center rounded-2xl bg-raised text-2xl text-soft active:scale-95" aria-label="Минус 0,1 кг">
          −
        </button>
        <label className="flex flex-1 items-baseline justify-center rounded-2xl bg-white/[0.04] px-3 py-2 ring-1 ring-line focus-within:ring-accent">
          <input
            value={text}
            onChange={(e) => setText(e.target.value.replace(/[^\d.,]/g, ''))}
            inputMode="decimal"
            aria-label="Вес в килограммах"
            className="tabular w-full min-w-0 bg-transparent text-center text-4xl font-semibold outline-none"
            placeholder="116,0"
          />
          <span className="text-mute">кг</span>
        </label>
        <button type="button" onClick={() => bump(0.1)} className="grid size-14 place-items-center rounded-2xl bg-raised text-2xl text-soft active:scale-95" aria-label="Плюс 0,1 кг">
          +
        </button>
      </div>
      {!valid && text !== '' && <p className="mt-2 text-center text-sm text-danger">Введи вес от 40 до 300 кг</p>}
      <label className="mt-4 flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-line">
        <span className="text-sm text-soft">Дата</span>
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="bg-transparent text-right text-[15px] text-ink outline-none [color-scheme:dark]"
        />
      </label>
      {existing && <p className="mt-2 text-sm text-warn">На эту дату уже есть запись: {String(existing.kg).replace('.', ',')} кг — она будет заменена.</p>}
    </Sheet>
  )
}
