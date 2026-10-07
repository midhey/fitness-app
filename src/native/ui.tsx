import type { PropsWithChildren, ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors } from './theme'

export function Screen({ children, contentStyle }: PropsWithChildren<{ contentStyle?: ViewStyle }>) {
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.screen, contentStyle]}>{children}</ScrollView></SafeAreaView>
}
export function Header({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return <View style={styles.header}><View style={{ flex: 1 }}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>{right}</View>
}
export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle | ViewStyle[] }>) { return <View style={[styles.card, style]}>{children}</View> }
export function Section({ children }: PropsWithChildren) { return <Text style={styles.section}>{children}</Text> }
export function Button({ title, onPress, tone = 'accent', disabled, compact, icon }: { title: string; onPress: () => void; tone?: 'accent' | 'secondary' | 'danger' | 'ghost'; disabled?: boolean; compact?: boolean; icon?: ReactNode }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, compact && styles.buttonCompact, tone === 'accent' && styles.buttonAccent, tone === 'secondary' && styles.buttonSecondary, tone === 'danger' && styles.buttonDanger, tone === 'ghost' && styles.buttonGhost, (pressed || disabled) && { opacity: .62 }]}>{icon}<Text style={[styles.buttonText, tone === 'accent' && { color: colors.accentInk }, tone === 'danger' && { color: '#260606' }]}>{title}</Text></Pressable>
}
export function Chip({ children, tone = 'default' }: PropsWithChildren<{ tone?: 'default' | 'accent' | 'cardio' | 'posture' }>) { const color = tone === 'accent' ? colors.accent : tone === 'cardio' ? colors.cardio : tone === 'posture' ? colors.posture : colors.soft; return <View style={[styles.chip, { borderColor: color + '40', backgroundColor: color + '14' }]}><Text style={[styles.chipText, { color }]}>{children}</Text></View> }
export function ProgressBar({ value, color = colors.accent }: { value: number; color?: string }) { return <View style={styles.track}><View style={[styles.fill, { width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color }]} /></View> }
export function Loading() { return <View style={styles.loading}><ActivityIndicator color={colors.accent} size="large" /></View> }
export function Metric({ label, value, unit }: { label: string; value: string | number; unit?: string }) { return <View style={styles.metric}><Text style={styles.muted}>{label}</Text><Text style={styles.metricValue}>{value}{unit ? <Text style={styles.metricUnit}> {unit}</Text> : null}</Text></View> }
export const text = StyleSheet.create({ body: { color: colors.text, fontSize: 16 }, soft: { color: colors.soft, fontSize: 14, lineHeight: 20 }, muted: { color: colors.mute, fontSize: 13 }, h2: { color: colors.text, fontSize: 19, fontWeight: '700' }, big: { color: colors.text, fontSize: 42, fontWeight: '700', letterSpacing: -1.2 }, accent: { color: colors.accent } })
export const layout = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' }, between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, gap: { gap: 10 }, stack: { gap: 12 }, divider: { height: 1, backgroundColor: colors.line, marginVertical: 12 } })
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg }, screen: { padding: 16, paddingBottom: 110, gap: 12 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }, title: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -.6 }, subtitle: { color: colors.mute, fontSize: 14, marginTop: 3 },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, section: { color: colors.soft, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: .8, marginTop: 10, marginLeft: 3 },
  button: { minHeight: 50, borderRadius: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, buttonCompact: { minHeight: 40, paddingHorizontal: 14, borderRadius: 13 }, buttonAccent: { backgroundColor: colors.accent }, buttonSecondary: { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.line }, buttonDanger: { backgroundColor: colors.danger }, buttonGhost: { backgroundColor: 'transparent' }, buttonText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  chip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: 1 }, chipText: { fontSize: 12, fontWeight: '700' }, track: { height: 7, backgroundColor: colors.elevated, borderRadius: 99, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 99 }, metric: { flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 13, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line }, muted: { color: colors.mute, fontSize: 12 }, metricValue: { color: colors.text, fontSize: 22, fontWeight: '700', marginTop: 5 }, metricUnit: { color: colors.mute, fontSize: 12, fontWeight: '600' },
})
