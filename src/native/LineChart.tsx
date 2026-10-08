import { useState } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg'
import { fmtShort } from '../lib/date'
import { colors, fonts } from './theme'

export interface ChartPoint {
  date: string
  value: number
}

const fmt = (value: number) => (Math.round(value * 10) / 10).toString().replace('.', ',')

function scale(
  points: ChartPoint[],
  width: number,
  height: number,
  pad: { left: number; right: number; top: number; bottom: number },
  extra: number[] = [],
) {
  const dates = points.map((p) => new Date(`${p.date}T12:00:00`).getTime())
  const values = [...points.map((p) => p.value), ...extra]
  const minX = Math.min(...dates)
  const maxX = Math.max(...dates)
  const margin = Math.max(0.5, (Math.max(...values) - Math.min(...values)) * 0.18)
  const minY = Math.min(...values) - margin
  const maxY = Math.max(...values) + margin
  const x = (i: number) =>
    points.length === 1 ? width / 2 : pad.left + ((dates[i] - minX) / Math.max(1, maxX - minX)) * (width - pad.left - pad.right)
  const y = (value: number) => pad.top + (1 - (value - minY) / Math.max(0.1, maxY - minY)) * (height - pad.top - pad.bottom)
  return { x, y, minY, maxY }
}

/** График с заливкой под линией; ширина — по контейнеру, чтобы подписи не растягивались */
export function LineChart({
  points,
  goal,
  unit,
  color = colors.accent,
  height = 190,
}: {
  points: ChartPoint[]
  goal?: number
  unit: string
  color?: string
  height?: number
}) {
  const [width, setWidth] = useState(0)
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))
  if (!points.length)
    return (
      <View style={[styles.empty, { height: height - 40 }]}>
        <Text style={styles.emptyText}>Пока нет записей</Text>
      </View>
    )
  const pad = { left: 6, right: 6, top: 18, bottom: 24 }
  const { x, y, minY, maxY } = width
    ? scale(points, width, height, pad, goal == null ? [] : [goal])
    : { x: () => 0, y: () => 0, minY: 0, maxY: 0 }
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join('')
  const area = `${line}L${x(points.length - 1).toFixed(1)} ${height - pad.bottom}L${x(0).toFixed(1)} ${height - pad.bottom}Z`
  const last = points[points.length - 1]
  const gradientId = `area-${color.slice(1)}`
  return (
    <View style={{ height }} onLayout={onLayout}>
      {width ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.28} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0, 0.5, 1].map((f) => {
            const py = pad.top + f * (height - pad.top - pad.bottom)
            return (
              <Line
                key={f}
                x1={0}
                y1={py}
                x2={width}
                y2={py}
                stroke={colors.line}
                strokeWidth={1}
                strokeDasharray={f === 1 ? undefined : '2 5'}
              />
            )
          })}
          {goal != null ? (
            <>
              <Line x1={0} y1={y(goal)} x2={width} y2={y(goal)} stroke={colors.warn} strokeWidth={1.5} strokeDasharray="5 5" />
              <SvgText x={width - 4} y={y(goal) - 6} fill={colors.warn} textAnchor="end" fontSize={11} fontFamily={fonts.semibold}>
                цель {fmt(goal)}
              </SvgText>
            </>
          ) : null}
          {points.length > 1 ? (
            <>
              <Path d={area} fill={`url(#${gradientId})`} />
              <Path d={line} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : null}
          {points.length <= 24
            ? points.map((p, i) => <Circle key={`${p.date}-${i}`} cx={x(i)} cy={y(p.value)} r={3} fill={color} />)
            : null}
          <Circle cx={x(points.length - 1)} cy={y(last.value)} r={6} fill={color} stroke={colors.card} strokeWidth={3} />
          <SvgText x={4} y={12} fill={colors.mute} fontSize={10} fontFamily={fonts.medium}>
            {fmt(maxY)} {unit}
          </SvgText>
          <SvgText x={4} y={height - pad.bottom - 4} fill={colors.mute} fontSize={10} fontFamily={fonts.medium}>
            {fmt(minY)}
          </SvgText>
          <SvgText x={4} y={height - 6} fill={colors.mute} fontSize={10} fontFamily={fonts.medium}>
            {fmtShort(points[0].date)}
          </SvgText>
          <SvgText x={width - 4} y={height - 6} fill={colors.mute} textAnchor="end" fontSize={10} fontFamily={fonts.medium}>
            {fmtShort(last.date)}
          </SvgText>
        </Svg>
      ) : null}
    </View>
  )
}

/** Мини-график без осей для карточек */
export function Sparkline({
  points,
  color = colors.accent,
  width = 120,
  height = 44,
}: {
  points: ChartPoint[]
  color?: string
  width?: number
  height?: number
}) {
  if (points.length < 2) return <View style={{ width, height }} />
  const { x, y } = scale(points, width, height, { left: 4, right: 4, top: 6, bottom: 6 })
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join('')
  const area = `${line}L${x(points.length - 1).toFixed(1)} ${height}L${x(0).toFixed(1)} ${height}Z`
  const gradientId = `spark-${color.slice(1)}`
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.3} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${gradientId})`} />
      <Path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={x(points.length - 1)} cy={y(points[points.length - 1].value)} r={4} fill={color} />
    </Svg>
  )
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.mute, fontFamily: fonts.regular, fontSize: 13 },
})
