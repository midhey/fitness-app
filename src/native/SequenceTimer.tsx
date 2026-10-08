import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import Svg, { Circle } from 'react-native-svg'
import type { PostureExercise } from '../types'
import { signal, useScreenAwake } from './feedback'
import { colors, fonts, tint } from './theme'
import { Button, ProgressBar, text } from './ui'

export interface Segment {
  label: string
  sub: string
  sec: number
  kind: 'prep' | 'work' | 'rest' | 'switch'
  breath?: 'in' | 'out'
}

export function segmentsFor(exercise: PostureExercise): Segment[] {
  const mode = exercise.mode
  const result: Segment[] = [{ label: 'Приготовься', sub: 'Займи исходное положение', sec: 5, kind: 'prep' }]
  if (mode.type === 'hold') {
    const sets = mode.sets ?? 1
    const sides = mode.perSide ? 2 : 1
    for (let set = 0; set < sets; set++) {
      const setName = mode.setLabels?.[set] ? `«${mode.setLabels[set]}» · ` : sets > 1 ? `Подход ${set + 1} из ${sets} · ` : ''
      const total = mode.reps * sides
      for (let repeat = 0; repeat < total; repeat++) {
        const [first, second] = mode.sideLabels ?? ['правая рука, левая нога', 'левая рука, правая нога']
        const side = mode.perSide ? ` · ${repeat % 2 === 0 ? first : second}` : ''
        const number = mode.perSide ? Math.floor(repeat / 2) + 1 : repeat + 1
        result.push({ label: mode.holdLabel, sub: `${setName}повтор ${number} из ${mode.reps}${side}`, sec: mode.holdSec, kind: 'work' })
        if (repeat < total - 1)
          result.push({
            label: mode.moveLabel,
            sub: `${setName}дальше повтор ${mode.perSide ? Math.floor((repeat + 1) / 2) + 1 : repeat + 2}`,
            sec: mode.moveSec,
            kind: 'rest',
          })
      }
      if (set < sets - 1)
        result.push({
          label: 'Отдых',
          sub: mode.setLabels?.[set + 1] ? `Дальше «${mode.setLabels[set + 1]}»` : `Дальше подход ${set + 2}`,
          sec: mode.restSec ?? 15,
          kind: 'switch',
        })
    }
  } else if (mode.type === 'timed') {
    const sides = mode.perSide ? ['Левая сторона', 'Правая сторона'] : ['']
    for (let round = 0; round < mode.rounds; round++)
      sides.forEach((side, sideIndex) => {
        result.push({
          label: 'Растяжка',
          sub: `${side ? `${side} · ` : ''}подход ${round + 1} из ${mode.rounds}`,
          sec: mode.seconds,
          kind: 'work',
        })
        const last = round === mode.rounds - 1 && sideIndex === sides.length - 1
        if (!last)
          result.push(
            mode.perSide
              ? { label: 'Выйди и смени сторону', sub: 'Спокойно, без рывков', sec: 6, kind: 'switch' }
              : { label: 'Короткий отдых', sub: 'Затем следующий подход', sec: 8, kind: 'switch' },
          )
      })
  } else {
    const sides = mode.perSide ? ['Правая сторона', 'Левая сторона'] : ['']
    sides.forEach((side, sideIndex) => {
      for (let cycle = 0; cycle < mode.cycles; cycle++)
        for (const phase of mode.phases)
          result.push({
            label: phase.label,
            sub: `${side ? `${side} · ` : ''}цикл ${cycle + 1} из ${mode.cycles}`,
            sec: phase.sec,
            kind: 'work',
            breath: phase.label.startsWith('Вдох') ? 'in' : 'out',
          })
      if (sideIndex < sides.length - 1)
        result.push({ label: 'Смени сторону', sub: mode.switchSub ?? 'Другая рука за голову', sec: 6, kind: 'switch' })
    })
  }
  return result
}

export const totalSeconds = (segments: Segment[]) => segments.reduce((sum, segment) => sum + segment.sec, 0)

function TimerRing({ value, seconds, color, breathScale }: { value: number; seconds: number; color: string; breathScale: number | null }) {
  const size = 120
  const stroke = 8
  const radius = (size - stroke) / 2
  const circumference = Math.PI * 2 * radius
  return (
    <View style={[styles.ring, { width: size, height: size }]}>
      <Svg width={size} height={size} style={[styles.absolute, { transform: [{ rotate: '-90deg' }] }]}>
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={colors.line} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, value)))}
        />
      </Svg>
      {breathScale !== null ? <View style={[styles.breath, { transform: [{ scale: breathScale }] }]} /> : null}
      <Text style={styles.seconds}>{Math.ceil(seconds)}</Text>
    </View>
  )
}

export function SequenceTimer({ segments, onDone }: { segments: Segment[]; onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [left, setLeft] = useState(segments[0].sec)
  const [now, setNow] = useState(Date.now())
  const doneRef = useRef(onDone)
  doneRef.current = onDone
  const finished = index >= segments.length
  const running = endsAt !== null && !finished

  useScreenAwake(running)
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(timer)
  }, [running])
  useEffect(() => {
    if (!running || endsAt === null || now < endsAt) return
    let next = index + 1
    let nextEnd = endsAt
    while (next < segments.length && nextEnd + segments[next].sec * 1000 <= now) {
      nextEnd += segments[next].sec * 1000
      next++
    }
    if (next >= segments.length) {
      setIndex(next)
      setEndsAt(null)
      signal('done')
      doneRef.current()
      return
    }
    setIndex(next)
    setLeft(segments[next].sec)
    setEndsAt(nextEnd + segments[next].sec * 1000)
    signal(segments[next].kind === 'switch' ? 'phase' : 'tick')
  }, [now, running, endsAt, index, segments])

  const start = () => {
    const timestamp = Date.now()
    setNow(timestamp)
    setEndsAt(timestamp + left * 1000)
  }
  const pause = () => {
    if (endsAt === null) return
    setLeft(Math.max(0.1, (endsAt - Date.now()) / 1000))
    setEndsAt(null)
  }
  const skip = () => {
    const next = index + 1
    if (next >= segments.length) {
      setIndex(next)
      setEndsAt(null)
      doneRef.current()
      return
    }
    setIndex(next)
    setLeft(segments[next].sec)
    if (running) {
      const timestamp = Date.now()
      setNow(timestamp)
      setEndsAt(timestamp + segments[next].sec * 1000)
    }
  }
  const reset = () => {
    setIndex(0)
    setEndsAt(null)
    setLeft(segments[0].sec)
  }

  if (finished)
    return (
      <View style={styles.finished}>
        <Ionicons name="checkmark-circle" size={36} color={colors.posture} />
        <Text style={[text.h2, { color: colors.posture }]}>Упражнение выполнено</Text>
        <Button title="Повторить" size="sm" tone="ghost" icon="refresh" onPress={reset} />
      </View>
    )
  const segment = segments[index]
  const remaining = running && endsAt !== null ? Math.max(0, (endsAt - now) / 1000) : left
  const fraction = 1 - remaining / segment.sec
  const breathScale = segment.breath === 'in' ? 0.55 + 0.45 * fraction : segment.breath === 'out' ? 1 - 0.45 * fraction : null
  const ringColor = segment.kind === 'work' ? colors.posture : segment.kind === 'prep' ? colors.soft : colors.warn
  const pristine = index === 0 && left === segments[0].sec

  return (
    <View style={styles.card}>
      <View style={styles.main}>
        <TimerRing value={fraction} seconds={remaining} color={ringColor} breathScale={breathScale} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: ringColor === colors.soft ? colors.text : ringColor }]}>{segment.label}</Text>
          <Text style={text.soft}>{segment.sub}</Text>
          <View style={{ height: 12 }} />
          <ProgressBar value={index / segments.length} color={colors.posture} height={6} />
          <Text style={[text.muted, { marginTop: 6 }]}>
            этап {index + 1} из {segments.length}
          </Text>
        </View>
      </View>
      <View style={styles.controls}>
        <Button
          title={running ? 'Пауза' : pristine ? 'Старт таймера' : 'Продолжить'}
          onPress={running ? pause : start}
          tone={running ? 'secondary' : 'accent'}
          color={colors.posture}
          icon={running ? 'pause' : 'play'}
          style={{ flex: 1 }}
        />
        <Pressable onPress={skip} accessibilityLabel="Следующий этап" style={styles.iconButton}>
          <Ionicons name="play-skip-forward" size={19} color={colors.soft} />
        </Pressable>
        <Pressable onPress={reset} accessibilityLabel="Сначала" style={styles.iconButton}>
          <Ionicons name="refresh" size={19} color={colors.soft} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  absolute: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  card: { borderRadius: 24, backgroundColor: colors.card, padding: 16, borderWidth: 1, borderColor: tint(colors.posture, 0.22) },
  main: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ring: { alignItems: 'center', justifyContent: 'center' },
  seconds: { color: colors.text, fontSize: 34, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  breath: { position: 'absolute', width: 70, height: 70, borderRadius: 35, backgroundColor: tint(colors.posture, 0.2) },
  label: { color: colors.text, fontSize: 20, fontFamily: fonts.bold, marginBottom: 4 },
  controls: { marginTop: 16, flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconButton: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.elevated },
  finished: {
    minHeight: 150,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: tint(colors.posture, 0.08),
    borderWidth: 1,
    borderColor: tint(colors.posture, 0.3),
  },
})
