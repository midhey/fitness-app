import { useCallback, useEffect, useMemo, useState } from 'react'
import { AccessibilityInfo, AppState, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from 'expo-router'
import Svg, { Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg'
import { ILLUSTRATIONS, type FigureSpec, type Illustration, type JointName } from './library'
import { FrontFigure, PropView, SideFigure } from './draw'
import { easeInOut, lerpPose, solveFront, solveSide, type V } from './rig'
import { colors } from '../native/theme'

function samplePose<T>(keys: T[], timeline: number[], time: number): T {
  if (keys.length === 1) return keys[0]
  const total = timeline.reduce((sum, value) => sum + value, 0)
  let cursor = ((time % total) + total) % total
  for (let index = 0; index < keys.length; index++) {
    const hold = timeline[2 * index] ?? 0
    const move = timeline[2 * index + 1] ?? 1
    if (cursor < hold) return keys[index]
    cursor -= hold
    if (cursor < move) return lerpPose(keys[index], keys[(index + 1) % keys.length], easeInOut(cursor / move))
    cursor -= move
  }
  return keys[0]
}

function keyOffset(timeline: number[], key: number) {
  let value = 0
  for (let index = 0; index < key * 2; index++) value += timeline[index] ?? 0
  return value
}

function jointOf(figure: FigureSpec, pose: unknown, joint: JointName): V {
  if (figure.rig === 'side') {
    const skeleton = solveSide(pose as never)
    switch (joint) {
      case 'handN': return skeleton.armN.end
      case 'handF': return skeleton.armF.end
      case 'elbowN': return skeleton.armN.mid
      case 'footN': return skeleton.legN.end
      case 'footF': return skeleton.legF.end
      case 'head': return skeleton.head
      case 'P': return skeleton.P
      default: return skeleton.armN.end
    }
  }
  const skeleton = solveFront(pose as never)
  return joint === 'handR' ? skeleton.armR.end : skeleton.armL.end
}

function Trace({ figure }: { figure: FigureSpec }) {
  const trace = useMemo(() => {
    if (!figure.trace) return null
    const { joint, from, to } = figure.trace
    const points: V[] = []
    for (let index = 0; index <= 18; index++) points.push(jointOf(figure, lerpPose(figure.keys[from] as never, figure.keys[to] as never, easeInOut(index / 18)), joint))
    const last = points[points.length - 1]
    const previous = points[points.length - 3]
    const dx = last.x - previous.x
    const dy = last.y - previous.y
    const length = Math.hypot(dx, dy) || 1
    const ux = dx / length
    const uy = dy / length
    const head = [`${last.x + ux * 5} ${last.y + uy * 5}`, `${last.x - uy * 3.6} ${last.y + ux * 3.6}`, `${last.x + uy * 3.6} ${last.y - ux * 3.6}`]
    return { line: `M${points.map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join('L')}`, head: `M${head[0]}L${head[1]}L${head[2]}Z` }
  }, [figure])
  if (!trace) return null
  return <G opacity={0.75}><Path d={trace.line} fill="none" stroke="#5eead4" strokeWidth={1.4} strokeDasharray="2.5 3.5" strokeLinecap="round" /><Path d={trace.head} fill="#5eead4" /></G>
}

function FigureView({ figure, pose }: { figure: FigureSpec; pose: unknown }) {
  return <G transform={figure.transform}>
    {figure.props?.map((prop, index) => <PropView key={index} p={prop} />)}
    <Trace figure={figure} />
    {figure.rig === 'side'
      ? <SideFigure sk={solveSide(pose as never)} muscles={figure.muscles} pedals={figure.pedals} nearOnly={figure.nearOnly} />
      : <FrontFigure sk={solveFront(pose as never)} muscles={figure.muscles} view={figure.view} side={figure.muscleSide} />}
    {figure.overlay?.map((prop, index) => <PropView key={`overlay-${index}`} p={prop} />)}
  </G>
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => subscription.remove()
  }, [])
  return reduced
}

function IllustrationSvg({ spec, poses }: { spec: Illustration; poses: unknown[] }) {
  const gradientId = `exercise-${spec.id}`
  return <Svg width="100%" height="100%" viewBox="0 0 320 240" accessibilityRole="image" accessibilityLabel={`Схема движения: ${spec.view}`}>
    <Defs><RadialGradient id={gradientId} cx="50%" cy="38%" rx="75%" ry="75%"><Stop offset="0" stopColor="#1d2227" /><Stop offset="1" stopColor="#15181c" /></RadialGradient></Defs>
    <Rect width={320} height={240} fill={`url(#${gradientId})`} />
    {spec.props.map((prop, index) => <PropView key={index} p={prop} />)}
    {spec.figures.map((figure, index) => <FigureView key={index} figure={figure} pose={poses[index]} />)}
  </Svg>
}

export function ExerciseIllustration({ id, compact = false, style }: { id: string; compact?: boolean; style?: ViewStyle }) {
  const spec = ILLUSTRATIONS[id]
  const reducedMotion = useReducedMotion()
  const [playing, setPlaying] = useState(!reducedMotion)
  const [time, setTime] = useState(0)
  const [active, setActive] = useState(AppState.currentState === 'active')
  const [focused, setFocused] = useState(true)

  useEffect(() => { setTime(0); setPlaying(!reducedMotion) }, [id, reducedMotion])
  useEffect(() => { const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active')); return () => subscription.remove() }, [])
  useFocusEffect(useCallback(() => { setFocused(true); return () => setFocused(false) }, []))
  useEffect(() => {
    if (!playing || !active || !focused || !spec) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (now - last < 33) return
      const delta = Math.min(.1, (now - last) / 1000)
      last = now
      setTime((value) => value + delta)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, active, focused, spec])

  if (!spec) return null
  const poses = spec.figures.map((figure) => samplePose(figure.keys as unknown[], spec.timeline, time))
  const total = spec.timeline.reduce((sum, value) => sum + value, 0)
  const cycle = ((time % total) + total) % total
  const activePhase = !playing ? spec.phases.findIndex((phase) => Math.abs(keyOffset(spec.timeline, phase.key) - cycle) < .02) : -1
  const jump = (key: number) => { setPlaying(false); setTime(keyOffset(spec.timeline, key) + .001) }

  return <View style={style}>
    <View style={[styles.frame, compact && styles.compact]}>
      <IllustrationSvg spec={spec} poses={poses} />
      <View pointerEvents="none" style={styles.caption}><Text style={styles.scheme}>СХЕМА</Text><Text style={styles.view}>{spec.view}</Text></View>
      {!compact ? <View style={styles.controls}>
        <Pressable onPress={() => setPlaying((value) => !value)} accessibilityLabel={playing ? 'Пауза анимации' : 'Запустить анимацию'} style={styles.play}><Ionicons name={playing ? 'pause' : 'play'} size={16} color={colors.text} /></Pressable>
        <View style={styles.phases}>{spec.phases.map((phase, index) => <Pressable key={`${phase.label}-${index}`} onPress={() => jump(phase.key)} style={[styles.phase, activePhase === index && styles.phaseActive]}><Text style={[styles.phaseText, activePhase === index && styles.phaseTextActive]}>{phase.label}</Text></Pressable>)}</View>
        <View style={styles.muscles}><View style={styles.muscleDot} /><Text style={styles.muscleText}>мышцы</Text></View>
      </View> : null}
    </View>
    {spec.note && !compact ? <Text style={styles.note}>{spec.note}</Text> : null}
  </View>
}

export function StaticIllustration({ id, keyIndex, style }: { id: string; keyIndex?: number; style?: ViewStyle }) {
  const spec = ILLUSTRATIONS[id]
  if (!spec) return null
  const key = keyIndex ?? spec.phases[spec.phases.length - 1]?.key ?? 0
  return <View style={[styles.frame, styles.compact, style]}><IllustrationSvg spec={spec} poses={spec.figures.map((figure) => figure.keys[Math.min(key, figure.keys.length - 1)])} /></View>
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 4 / 3, borderRadius: 20, overflow: 'hidden', backgroundColor: '#15181c', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  compact: { borderRadius: 15 }, caption: { position: 'absolute', left: 11, top: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  scheme: { color: '#FFFFFF80', fontSize: 9, fontWeight: '800', letterSpacing: .7, backgroundColor: '#FFFFFF0D', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }, view: { color: '#FFFFFF73', fontSize: 10, fontWeight: '600' },
  controls: { position: 'absolute', left: 8, right: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }, play: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center' },
  phases: { flexDirection: 'row', padding: 2, borderRadius: 18, backgroundColor: '#00000088' }, phase: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 15 }, phaseActive: { backgroundColor: '#5eead4' }, phaseText: { color: '#FFFFFFB8', fontSize: 10, fontWeight: '700' }, phaseTextActive: { color: '#0c1413' },
  muscles: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, backgroundColor: '#00000088', paddingHorizontal: 8, paddingVertical: 6 }, muscleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2dd4bf' }, muscleText: { color: '#FFFFFF8C', fontSize: 9 }, note: { color: colors.mute, fontSize: 12, marginTop: 6, marginHorizontal: 4 },
})
