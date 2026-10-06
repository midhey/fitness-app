import { StaticIllustration } from '../illustrations/ExerciseIllustration'
import { ILLUSTRATIONS } from '../illustrations/library'

/** Только для разработки: ?gallery=id1,id2 — все ключевые позы схем рядом */
export function Gallery() {
  const only = new URLSearchParams(location.search).get('gallery') ?? ''
  const ids = Object.keys(ILLUSTRATIONS).filter((id) => !only || only.split(',').includes(id))
  return (
    <div className="space-y-3 p-2">
      {ids.map((id) => (
        <div key={id}>
          <div className="text-xs text-soft">{id}</div>
          <div className="grid grid-cols-2 gap-2">
            {ILLUSTRATIONS[id].figures[0].keys.map((_, k) => (
              <div key={k} className="overflow-hidden rounded-lg">
                <StaticIllustration id={id} keyIndex={k} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
