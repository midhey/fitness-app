import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { actions, useStore } from '@/src/store/store'
import { programWeek, startForWeek } from '@/src/store/selectors'
import { fmtLong, todayISO } from '@/src/lib/date'
import { TOTAL_WEEKS, WEEKS } from '@/src/data/program'
import { Button, Card, Header, IconButton, Screen, SectionTitle, Txt } from '@/src/native/ui'
import { colors, fonts, radius } from '@/src/native/theme'

const num = (value: string) => Number(value.trim().replace(',', '.'))
const fmt = (value: number | null) => (value == null ? '' : String(value).replace('.', ','))

export default function ProfileScreen() {
  const profile = useStore((s) => s.profile)
  const settings = useStore((s) => s.settings)
  const today = todayISO()
  const currentWeek = programWeek(profile, today)
  const [height, setHeight] = useState(String(profile.heightCm))
  const [start, setStart] = useState(fmt(profile.startWeight))
  const [goal, setGoal] = useState(fmt(profile.goalWeight))
  const [initial, setInitial] = useState(fmt(profile.initialWeight))
  const [week, setWeek] = useState(currentWeek)
  const programStart = week === currentWeek ? profile.programStart : startForWeek(today, week)

  const save = () => {
    const h = num(height)
    const s = num(start)
    const g = num(goal)
    const i = initial.trim() ? num(initial) : null
    const weightOk = (v: number) => Number.isFinite(v) && v >= 30 && v <= 350
    if (!Number.isFinite(h) || h < 100 || h > 250) return Alert.alert('Проверь рост', 'Укажи рост от 100 до 250 см.')
    if (!weightOk(s) || !weightOk(g) || (i != null && !weightOk(i))) return Alert.alert('Проверь вес', 'Вес — от 30 до 350 кг.')
    actions.updateProfile({ heightCm: h, startWeight: s, goalWeight: g, initialWeight: i, programStart })
    router.back()
  }
  const reset = () =>
    Alert.alert('Сбросить все данные?', 'Вес, тренировки, кардио, осанка и настройки будут удалены без возможности восстановления.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Сбросить',
        style: 'destructive',
        onPress: () => {
          actions.resetAll()
          router.dismissAll()
        },
      },
    ])

  return (
    <Screen footer={<Button title="Сохранить" size="lg" icon="checkmark" onPress={save} />}>
      <Header
        title="Профиль"
        subtitle="Параметры программы и приложения"
        right={<IconButton icon="close" label="Закрыть" onPress={() => router.back()} />}
      />

      <SectionTitle>Цели</SectionTitle>
      <Card style={{ gap: 12 }}>
        <View style={styles.fields}>
          <Field label="Рост, см" value={height} onChange={setHeight} keyboard="number-pad" />
          <Field label="Вес до программы" value={initial} onChange={setInitial} placeholder="необязательно" />
        </View>
        <View style={styles.fields}>
          <Field label="Старт, кг" value={start} onChange={setStart} />
          <Field label="Цель, кг" value={goal} onChange={setGoal} />
        </View>
      </Card>

      <SectionTitle>Неделя программы</SectionTitle>
      <Card>
        <View style={styles.weeks}>
          {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((n) => (
            <Pressable
              key={n}
              onPress={() => setWeek(n)}
              accessibilityState={{ selected: week === n }}
              style={[styles.week, week === n && styles.weekOn]}
            >
              <Text style={[styles.weekText, week === n && { color: colors.accentInk }]}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <Txt v="strong" style={{ marginTop: 12 }}>
          {WEEKS[week - 1].phase}: {WEEKS[week - 1].summary.toLowerCase()}
        </Txt>
        <Txt v="soft" style={{ marginTop: 4 }}>
          Начало программы — {fmtLong(programStart).toLowerCase()}. Меняй неделю, если пропустил занятия или начинаешь цикл заново.
        </Txt>
      </Card>

      <SectionTitle>Настройки</SectionTitle>
      <Card>
        <Toggle
          title="Вибрация"
          hint="Отклик на нажатия, подходы и таймеры"
          value={settings.vibration}
          onChange={(vibration) => actions.updateSettings({ vibration })}
        />
        <View style={styles.divider} />
        <Toggle
          title="Звук"
          hint="Сигналы таймеров отдыха и комплексов"
          value={settings.sound}
          onChange={(sound) => actions.updateSettings({ sound })}
        />
      </Card>

      <SectionTitle>Данные</SectionTitle>
      <Card>
        <Txt v="soft">Все записи хранятся только на этом устройстве, без интернета и аккаунтов.</Txt>
        <Button
          title="Сбросить все данные"
          tone="ghost"
          icon="trash-outline"
          onPress={reset}
          style={{ marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 0 }}
        />
      </Card>
    </Screen>
  )
}

function Field({
  label,
  value,
  onChange,
  keyboard = 'decimal-pad',
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  keyboard?: 'decimal-pad' | 'number-pad'
  placeholder?: string
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard}
        placeholder={placeholder}
        placeholderTextColor={colors.mute}
        selectTextOnFocus
        style={styles.input}
      />
    </View>
  )
}

function Toggle({ title, hint, value, onChange }: { title: string; hint: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Txt v="strong">{title}</Txt>
        <Txt v="muted">{hint}</Txt>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.raised }} thumbColor={colors.text} />
    </View>
  )
}

const styles = StyleSheet.create({
  fields: { flexDirection: 'row', gap: 10 },
  label: { color: colors.soft, fontFamily: fonts.medium, fontSize: 12, marginBottom: 6 },
  input: {
    minWidth: 0,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.elevated,
    color: colors.text,
    fontFamily: fonts.semibold,
    fontSize: 17,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  weeks: { flexDirection: 'row', gap: 6 },
  week: { flex: 1, height: 44, borderRadius: radius.sm, backgroundColor: colors.elevated, alignItems: 'center', justifyContent: 'center' },
  weekOn: { backgroundColor: colors.accent },
  weekText: { color: colors.soft, fontFamily: fonts.bold, fontSize: 16 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 14 },
})
