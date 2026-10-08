import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { actions, useStore } from '@/src/store/store'
import { latestWeight } from '@/src/store/selectors'
import { addDays, fmtLong, todayISO } from '@/src/lib/date'
import { Button, Card, Header, IconButton, Screen, Txt } from '@/src/native/ui'
import { colors, fonts } from '@/src/native/theme'
import { success } from '@/src/native/feedback'

export default function WeightScreen() {
  const weights = useStore((s) => s.weights)
  const today = todayISO()
  const [date, setDate] = useState(today)
  const [value, setValue] = useState(() => String(latestWeight(weights)?.kg ?? '').replace('.', ','))
  const existing = weights.find((w) => w.date === date)

  const save = () => {
    const kg = Number(value.trim().replace(',', '.'))
    if (!value.trim() || !Number.isFinite(kg) || kg < 30 || kg > 350) return Alert.alert('Проверь вес', 'Введи значение от 30 до 350 кг.')
    actions.saveWeight(date, Math.round(kg * 10) / 10)
    success()
    router.back()
  }
  const nudge = (delta: number) => {
    const kg = Number(value.replace(',', '.'))
    if (Number.isFinite(kg)) setValue(String(Math.round((kg + delta) * 10) / 10).replace('.', ','))
  }

  return (
    <Screen footer={<Button title={existing ? 'Обновить запись' : 'Сохранить'} size="lg" icon="checkmark" onPress={save} />}>
      <Header
        title="Записать вес"
        subtitle="Утром, натощак, в одинаковых условиях"
        right={<IconButton icon="close" label="Закрыть" onPress={() => router.back()} />}
      />
      <Card style={styles.card}>
        <View style={styles.inputRow}>
          <IconButton icon="remove" label="Минус 0,1 кг" size={48} background={colors.elevated} onPress={() => nudge(-0.1)} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <TextInput
              autoFocus
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              selectTextOnFocus
              style={styles.bigInput}
              placeholder="0,0"
              placeholderTextColor={colors.mute}
            />
            <Text style={styles.unit}>килограммов</Text>
          </View>
          <IconButton icon="add" label="Плюс 0,1 кг" size={48} background={colors.elevated} onPress={() => nudge(0.1)} />
        </View>
      </Card>
      <Card style={styles.dateRow}>
        <IconButton
          icon="chevron-back"
          label="Предыдущий день"
          size={40}
          background={colors.elevated}
          onPress={() => setDate(addDays(date, -1))}
        />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt v="strong">{fmtLong(date)}</Txt>
          {existing ? (
            <Txt v="muted" color={colors.warn}>
              запись есть: {String(existing.kg).replace('.', ',')} кг — заменится
            </Txt>
          ) : null}
        </View>
        <IconButton
          icon="chevron-forward"
          label="Следующий день"
          size={40}
          background={colors.elevated}
          color={date >= today ? colors.line : colors.soft}
          onPress={() => date < today && setDate(addDays(date, 1))}
        />
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { paddingVertical: 24 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bigInput: {
    alignSelf: 'stretch',
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 56,
    letterSpacing: -1.5,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
    paddingVertical: 0,
  },
  unit: { color: colors.mute, fontFamily: fonts.medium, fontSize: 13 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
})
