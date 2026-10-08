import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { AppState } from '../types'
import { addDays, MONTHS_NOM, mondayOf, parseISO, WEEKDAYS_SHORT } from '../lib/date'
import { dayStatus, isSameMonth, monthGrid } from '../store/selectors'
import { colors, fonts, tint } from './theme'

/** Маркеры различаются и цветом, и формой: круг — силовая, ромб — кардио, полоска — осанка */
export function Markers({ strength, cardio, posture }: { strength: boolean; cardio: boolean; posture: boolean }) {
  return (
    <View style={styles.markers}>
      {strength ? <View style={styles.mStrength} /> : null}
      {cardio ? <View style={styles.mCardio} /> : null}
      {posture ? <View style={styles.mPosture} /> : null}
    </View>
  )
}

export function MarkersLegend() {
  return (
    <View style={styles.legend}>
      <View style={styles.legendItem}>
        <Markers strength cardio={false} posture={false} />
        <Text style={styles.legendText}>силовая</Text>
      </View>
      <View style={styles.legendItem}>
        <Markers strength={false} cardio posture={false} />
        <Text style={styles.legendText}>кардио</Text>
      </View>
      <View style={styles.legendItem}>
        <Markers strength={false} cardio={false} posture />
        <Text style={styles.legendText}>осанка</Text>
      </View>
    </View>
  )
}

/** Текущая неделя: Пн–Вс с отметками занятий */
export function WeekStrip({ state, today }: { state: AppState; today: string }) {
  const monday = mondayOf(today)
  return (
    <View style={styles.week}>
      {WEEKDAYS_SHORT.map((label, index) => {
        const iso = addDays(monday, index)
        const status = dayStatus(state, iso)
        const isToday = iso === today
        const future = iso > today
        return (
          <View key={iso} style={[styles.day, isToday && styles.dayToday]}>
            <Text style={[styles.dayLabel, isToday && { color: colors.accentInk }]}>{label}</Text>
            <Text style={[styles.dayNumber, isToday && { color: colors.accentInk }, future && { color: colors.mute }]}>
              {parseISO(iso).getDate()}
            </Text>
            <View style={{ height: 8 }}>
              {isToday ? (
                <View style={styles.todayDot} />
              ) : (
                <Markers
                  strength={status.strength.length > 0}
                  cardio={status.cardio.length > 0}
                  posture={!!status.posture || !!status.back}
                />
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

export function MonthCalendar({
  state,
  year,
  month,
  today,
  selected,
  onSelect,
  onMonth,
}: {
  state: AppState
  year: number
  month: number
  today: string
  selected: string | null
  onSelect: (iso: string) => void
  onMonth: (delta: number) => void
}) {
  const days = monthGrid(year, month)
  const cells = days.slice(35).some((d) => isSameMonth(d, year, month)) ? days : days.slice(0, 35)
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
  return (
    <View>
      <View style={styles.monthHead}>
        <Pressable onPress={() => onMonth(-1)} accessibilityLabel="Предыдущий месяц" style={styles.monthNav} hitSlop={6}>
          <Ionicons name="chevron-back" size={18} color={colors.soft} />
        </Pressable>
        <Text style={styles.monthTitle}>
          {MONTHS_NOM[month]} {year}
        </Text>
        <Pressable onPress={() => onMonth(1)} accessibilityLabel="Следующий месяц" style={styles.monthNav} hitSlop={6}>
          <Ionicons name="chevron-forward" size={18} color={colors.soft} />
        </Pressable>
      </View>
      <View style={styles.calRow}>
        {WEEKDAYS_SHORT.map((d) => (
          <Text key={d} style={styles.calWeekday}>
            {d}
          </Text>
        ))}
      </View>
      {rows.map((row) => (
        <View key={row[0]} style={styles.calRow}>
          {row.map((iso) => {
            const inMonth = isSameMonth(iso, year, month)
            const st = dayStatus(state, iso)
            const posture = !!st.posture || !!st.back
            const any = st.strength.length > 0 || st.cardio.length > 0 || posture
            const isSelected = selected === iso
            return (
              <Pressable
                key={iso}
                onPress={() => onSelect(iso)}
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.calDay,
                  any && inMonth && styles.calDayActive,
                  isSelected && styles.calDaySelected,
                  !inMonth && { opacity: 0.28 },
                ]}
              >
                <Text style={[styles.calNumber, iso === today && { color: colors.accent, fontFamily: fonts.bold }]}>
                  {parseISO(iso).getDate()}
                </Text>
                <Markers strength={st.strength.length > 0} cardio={st.cardio.length > 0} posture={posture} />
              </Pressable>
            )
          })}
        </View>
      ))}
      <MarkersLegend />
    </View>
  )
}

const styles = StyleSheet.create({
  markers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, height: 8 },
  mStrength: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  mCardio: { width: 6, height: 6, borderRadius: 1, backgroundColor: colors.cardio, transform: [{ rotate: '45deg' }] },
  mPosture: { width: 10, height: 5, borderRadius: 3, backgroundColor: colors.posture },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { color: colors.mute, fontFamily: fonts.regular, fontSize: 11 },
  week: { flexDirection: 'row', gap: 6 },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    gap: 3,
  },
  dayToday: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayLabel: { color: colors.mute, fontFamily: fonts.medium, fontSize: 11 },
  dayNumber: { color: colors.text, fontFamily: fonts.bold, fontSize: 17, fontVariant: ['tabular-nums'] },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.accentInk, alignSelf: 'center', marginTop: 1 },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthNav: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16 },
  calRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  calWeekday: { flex: 1, textAlign: 'center', color: colors.mute, fontFamily: fonts.medium, fontSize: 11, paddingBottom: 2 },
  calDay: { flex: 1, aspectRatio: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 3 },
  calDayActive: { backgroundColor: tint(colors.text, 0.04) },
  calDaySelected: { backgroundColor: colors.raised, borderWidth: 1, borderColor: tint(colors.text, 0.16) },
  calNumber: { color: colors.text, fontFamily: fonts.medium, fontSize: 13, fontVariant: ['tabular-nums'] },
})
