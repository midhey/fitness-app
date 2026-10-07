import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg'
import { colors } from './theme'

export interface ChartPoint { date: string; value: number }
export function LineChart({ points, goal, unit }: { points: ChartPoint[]; goal?: number; unit: string }) {
  const width = 320
  const height = 180
  const pad = { left: 38, right: 12, top: 15, bottom: 27 }
  if (!points.length) return <View style={styles.empty}><Text style={styles.emptyText}>За этот период записей нет.</Text></View>
  const dates = points.map((point) => new Date(`${point.date}T12:00:00`).getTime())
  const values = [...points.map((point) => point.value), ...(goal == null ? [] : [goal])]
  const minX = Math.min(...dates)
  const maxX = Math.max(...dates)
  const margin = Math.max(.5, (Math.max(...values) - Math.min(...values)) * .15)
  const minY = Math.min(...values) - margin
  const maxY = Math.max(...values) + margin
  const x = (date: number) => pad.left + ((date - minX) / Math.max(1, maxX - minX)) * (width - pad.left - pad.right)
  const y = (value: number) => pad.top + (1 - (value - minY) / Math.max(.1, maxY - minY)) * (height - pad.top - pad.bottom)
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(dates[index]).toFixed(1)} ${y(point.value).toFixed(1)}`).join('')
  return <View style={styles.wrap}><Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
    {[0, .5, 1].map((fraction) => { const value = maxY - (maxY - minY) * fraction; const py = y(value); return <Line key={`line-${fraction}`} x1={pad.left} y1={py} x2={width - pad.right} y2={py} stroke={colors.line} strokeWidth={1} /> })}
    {goal != null ? <><Line x1={pad.left} y1={y(goal)} x2={width - pad.right} y2={y(goal)} stroke={colors.warn} strokeDasharray="4 4" /><SvgText x={width - pad.right} y={y(goal) - 4} fill={colors.warn} textAnchor="end" fontSize={9}>цель {goal}</SvgText></> : null}
    {points.length > 1 ? <Path d={path} fill="none" stroke={colors.accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
    {points.map((point, index) => <Circle key={`${point.date}-${index}`} cx={x(dates[index])} cy={y(point.value)} r={4} fill={colors.accent} stroke={colors.bg} strokeWidth={2} />)}
    <SvgText x={pad.left} y={height - 7} fill={colors.mute} fontSize={9}>{points[0].date.slice(5).replace('-', '.')}</SvgText><SvgText x={width - pad.right} y={height - 7} fill={colors.mute} textAnchor="end" fontSize={9}>{points[points.length - 1].date.slice(5).replace('-', '.')}</SvgText>
    <SvgText x={4} y={pad.top + 4} fill={colors.mute} fontSize={9}>{maxY.toFixed(1)}</SvgText><SvgText x={4} y={height - pad.bottom} fill={colors.mute} fontSize={9}>{minY.toFixed(1)} {unit}</SvgText>
  </Svg></View>
}
const styles = StyleSheet.create({ wrap: { width: '100%', overflow: 'hidden' }, empty: { height: 150, alignItems: 'center', justifyContent: 'center' }, emptyText: { color: colors.mute, fontSize: 13 } })
