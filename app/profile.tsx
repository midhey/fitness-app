import { useState } from 'react'
import { Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { actions, useStore } from '@/src/store/store'
import { Button, Card, Header, Screen, Section, layout, text } from '@/src/native/ui'
import { colors } from '@/src/native/theme'

export default function ProfileScreen() {
  const profile = useStore((s) => s.profile)
  const settings = useStore((s) => s.settings)
  const [height, setHeight] = useState(String(profile.heightCm))
  const [start, setStart] = useState(String(profile.startWeight).replace('.', ','))
  const [goal, setGoal] = useState(String(profile.goalWeight).replace('.', ','))
  const [initial, setInitial] = useState(profile.initialWeight == null ? '' : String(profile.initialWeight).replace('.', ','))
  const [programStart, setProgramStart] = useState(profile.programStart)
  const save = () => { const parsed = [height, start, goal].map((item) => Number(item.replace(',', '.'))); const initialValue = initial.trim() ? Number(initial.replace(',', '.')) : null; if (parsed.some((item) => !Number.isFinite(item)) || (initialValue != null && !Number.isFinite(initialValue))) return Alert.alert('Проверь значения'); actions.updateProfile({ heightCm: parsed[0], startWeight: parsed[1], goalWeight: parsed[2], initialWeight: initialValue, programStart }); router.back() }
  const field = (label: string, value: string, onChangeText: (value: string) => void, keyboardType: 'decimal-pad' | 'number-pad' | 'numbers-and-punctuation' = 'decimal-pad') => <View style={{ flex: 1 }}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} style={styles.input} placeholderTextColor={colors.mute} /></View>
  return <Screen contentStyle={{ paddingTop: 8 }}><Header title="Профиль" subtitle="Параметры программы и приложения" />
    <Card><View style={styles.fields}>{field('Рост, см', height, setHeight, 'number-pad')}{field('Старт, кг', start, setStart)}</View><View style={styles.fields}>{field('Цель, кг', goal, setGoal)}{field('Вес до программы', initial, setInitial)}</View>{field('Начало программы', programStart, setProgramStart, 'numbers-and-punctuation')}<View style={{ height: 18 }} /><Button title="Сохранить" onPress={save} /><Button title="Отмена" tone="ghost" onPress={() => router.back()} /></Card>
    <Section>Настройки</Section><Card><View style={layout.between}><View><Text style={text.body}>Вибрация</Text><Text style={text.muted}>Отклик на подходы и завершение</Text></View><Switch value={settings.vibration} onValueChange={(vibration) => actions.updateSettings({ vibration })} trackColor={{ true: colors.accent }} /></View><View style={styles.divider} /><View style={layout.between}><View><Text style={text.body}>Звук</Text><Text style={text.muted}>Сигналы таймеров</Text></View><Switch value={settings.sound} onValueChange={(sound) => actions.updateSettings({ sound })} trackColor={{ true: colors.accent }} /></View></Card>
    <Section>Данные</Section><Card><Text style={text.soft}>Все записи находятся в защищённом хранилище приложения на этом устройстве.</Text><View style={{ height: 14 }} /><Button title="Сбросить все данные" tone="danger" onPress={() => Alert.alert('Сбросить всё?', 'Вес, тренировки, кардио и настройки будут удалены.', [{ text: 'Отмена' }, { text: 'Сбросить', style: 'destructive', onPress: () => { actions.resetAll(); router.replace('/') } }])} /></Card>
  </Screen>
}
const styles = StyleSheet.create({ fields: { flexDirection: 'row', gap: 10 }, label: { color: colors.soft, fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 10 }, input: { height: 50, borderRadius: 14, backgroundColor: colors.elevated, color: colors.text, fontSize: 16, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line }, divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 14 } })
