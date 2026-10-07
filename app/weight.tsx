import { useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { actions, useStore } from '@/src/store/store'
import { latestWeight } from '@/src/store/selectors'
import { todayISO } from '@/src/lib/date'
import { Button, Card, Header, Screen, text } from '@/src/native/ui'
import { colors } from '@/src/native/theme'

export default function WeightScreen() {
  const weights = useStore((s) => s.weights)
  const [date, setDate] = useState(todayISO())
  const [value, setValue] = useState(() => String(latestWeight(weights)?.kg ?? '').replace('.', ','))
  const save = () => { const kg = Number(value.replace(',', '.')); if (!Number.isFinite(kg) || kg < 30 || kg > 350) return Alert.alert('Проверь вес', 'Введите значение от 30 до 350 кг.'); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Alert.alert('Проверь дату', 'Нужен формат ГГГГ-ММ-ДД.'); actions.saveWeight(date, kg); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); router.back() }
  return <Screen contentStyle={{ paddingTop: 8 }}><Header title="Записать вес" subtitle="Данные хранятся только на этом устройстве" /><Card><Text style={styles.label}>Вес, кг</Text><TextInput autoFocus value={value} onChangeText={setValue} keyboardType="decimal-pad" selectTextOnFocus style={styles.bigInput} placeholder="100,0" placeholderTextColor={colors.mute} /><Text style={styles.label}>Дата</Text><TextInput value={date} onChangeText={setDate} keyboardType="numbers-and-punctuation" style={styles.input} placeholder="ГГГГ-ММ-ДД" placeholderTextColor={colors.mute} /><View style={{ height: 18 }} /><Button title="Сохранить" onPress={save} /><Button title="Отмена" tone="ghost" onPress={() => router.back()} /></Card><Text style={[text.muted, { textAlign: 'center' }]}>Для сравнимости взвешивайся утром, в одинаковых условиях.</Text></Screen>
}
const styles = StyleSheet.create({ label: { color: colors.soft, fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 10 }, bigInput: { height: 76, borderRadius: 18, backgroundColor: colors.elevated, color: colors.text, fontSize: 36, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: colors.line, marginBottom: 12 }, input: { height: 52, borderRadius: 15, backgroundColor: colors.elevated, color: colors.text, fontSize: 17, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.line } })
