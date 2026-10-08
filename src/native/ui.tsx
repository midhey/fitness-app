import { useState, type PropsWithChildren, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'
import { colors, fonts, radius, tint } from './theme'
import { tap } from './feedback'

export type IconName = keyof typeof Ionicons.glyphMap

// ---------- Типографика ----------

export const text = StyleSheet.create({
  display: { color: colors.text, fontFamily: fonts.bold, fontSize: 44, lineHeight: 50, letterSpacing: -1.4 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.8 },
  h1: { color: colors.text, fontFamily: fonts.bold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },
  h2: { color: colors.text, fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  body: { color: colors.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  strong: { color: colors.text, fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 },
  soft: { color: colors.soft, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  muted: { color: colors.mute, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { color: colors.mute, fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: 'uppercase' },
  num: { fontVariant: ['tabular-nums'] },
  accent: { color: colors.accent },
})

export function Txt({
  v = 'body',
  color,
  style,
  numberOfLines,
  children,
}: PropsWithChildren<{ v?: keyof typeof text; color?: string; style?: StyleProp<TextStyle>; numberOfLines?: number }>) {
  return (
    <Text style={[text[v], color ? { color } : null, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  )
}

// ---------- Каркас экрана ----------

export function Screen({
  children,
  contentStyle,
  tabs,
  footer,
}: PropsWithChildren<{ contentStyle?: ViewStyle; tabs?: boolean; footer?: ReactNode }>) {
  const insets = useSafeAreaInsets()
  // Высота закреплённой панели меняется (например, появляется таймер отдыха) — отступ по факту
  const [footerHeight, setFooterHeight] = useState(0)
  const bottom = footer ? footerHeight + 16 : (tabs ? 104 : 28) + insets.bottom
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[styles.screen, { paddingBottom: bottom }, contentStyle]}
      >
        {children}
      </ScrollView>
      {footer ? (
        <LinearGradient
          colors={[tint(colors.bg, 0), colors.bg, colors.bg]}
          locations={[0, 0.28, 1]}
          style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}
          pointerEvents="box-none"
          onLayout={(e) => setFooterHeight(Math.round(e.nativeEvent.layout.height))}
        >
          {footer}
        </LinearGradient>
      ) : null}
    </SafeAreaView>
  )
}

export function Header({
  title,
  eyebrow,
  subtitle,
  right,
  onBack,
}: {
  title: string
  eyebrow?: string
  subtitle?: string
  right?: ReactNode
  onBack?: () => void
}) {
  return (
    <View style={styles.header}>
      {onBack ? <IconButton icon="chevron-back" label="Назад" onPress={onBack} /> : null}
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <Txt v="label" color={colors.accent}>
            {eyebrow}
          </Txt>
        ) : null}
        <Txt v={onBack ? 'h1' : 'title'}>{title}</Txt>
        {subtitle ? (
          <Txt v="soft" style={{ marginTop: 2 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  )
}

export function SectionTitle({ children, action }: PropsWithChildren<{ action?: { label: string; onPress: () => void } }>) {
  return (
    <View style={styles.section}>
      <Txt v="label" color={colors.soft}>
        {children}
      </Txt>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={10}>
          <Txt v="soft" color={colors.accent} style={{ fontFamily: fonts.semibold }}>
            {action.label}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  )
}

// ---------- Поверхности ----------

export function Card({
  children,
  style,
  tone,
  onPress,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; tone?: string; onPress?: () => void }>) {
  const toneStyle = tone ? { backgroundColor: tint(tone, 0.08), borderColor: tint(tone, 0.28) } : null
  if (!onPress) return <View style={[styles.card, toneStyle, style]}>{children}</View>
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, toneStyle, style, pressed && styles.pressed]}>
      {children}
    </Pressable>
  )
}

/** Акцентная карточка с мягким градиентом цвета раздела */
export function HeroCard({ children, color = colors.accent, style }: PropsWithChildren<{ color?: string; style?: StyleProp<ViewStyle> }>) {
  return (
    <View style={[styles.hero, { borderColor: tint(color, 0.3) }, style]}>
      <LinearGradient
        colors={[tint(color, 0.24), tint(color, 0.06), tint(color, 0.02)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  )
}

export function Banner({
  icon,
  color = colors.warn,
  title,
  children,
  action,
}: PropsWithChildren<{ icon: IconName; color?: string; title: string; action?: ReactNode }>) {
  return (
    <View style={[styles.banner, { backgroundColor: tint(color, 0.08), borderColor: tint(color, 0.3) }]}>
      <Ionicons name={icon} size={22} color={color} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt v="strong">{title}</Txt>
        {children ? <Txt v="soft">{children}</Txt> : null}
        {action}
      </View>
    </View>
  )
}

export function Collapsible({ title, children, initiallyOpen = false }: PropsWithChildren<{ title: string; initiallyOpen?: boolean }>) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <View style={styles.card}>
      <Pressable onPress={() => setOpen((value) => !value)} style={styles.between} hitSlop={8}>
        <Txt v="h2">{title}</Txt>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.mute} />
      </Pressable>
      {open ? <View style={{ marginTop: 12 }}>{children}</View> : null}
    </View>
  )
}

// ---------- Управление ----------

type ButtonTone = 'accent' | 'secondary' | 'danger' | 'ghost'

export function Button({
  title,
  onPress,
  tone = 'accent',
  size = 'md',
  disabled,
  icon,
  iconRight,
  color,
  style,
}: {
  title: string
  onPress: () => void
  tone?: ButtonTone
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  icon?: IconName
  iconRight?: IconName
  /** Цвет заливки для tone="accent" (кардио, осанка) */
  color?: string
  style?: StyleProp<ViewStyle>
}) {
  const fill = color ?? colors.accent
  const ink = tone === 'accent' ? (color ? colors.bg : colors.accentInk) : tone === 'danger' ? '#2A0707' : colors.text
  const iconSize = size === 'sm' ? 16 : 19
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        tap()
        onPress()
      }}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.buttonSm,
        size === 'lg' && styles.buttonLg,
        tone === 'accent' && { backgroundColor: fill },
        tone === 'secondary' && styles.buttonSecondary,
        tone === 'danger' && { backgroundColor: colors.danger },
        pressed && styles.pressed,
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={iconSize} color={ink} /> : null}
      <Text
        numberOfLines={1}
        style={[styles.buttonText, { flexShrink: 1 }, size === 'sm' && { fontSize: 14 }, size === 'lg' && { fontSize: 17 }, { color: ink }]}
      >
        {title}
      </Text>
      {iconRight ? <Ionicons name={iconRight} size={iconSize} color={ink} /> : null}
    </Pressable>
  )
}

export function IconButton({
  icon,
  onPress,
  label,
  color = colors.soft,
  background = colors.card,
  size = 44,
}: {
  icon: IconName
  onPress: () => void
  label: string
  color?: string
  background?: string
  size?: number
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: background },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.47)} color={color} />
    </Pressable>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  color = colors.accent,
}: {
  options: { value: T; label: string; hint?: string }[]
  value: T | null
  onChange: (value: T) => void
  color?: string
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const on = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              tap()
              onChange(option.value)
            }}
            accessibilityState={{ selected: on }}
            style={[styles.segment, on && { backgroundColor: color }]}
          >
            <Text style={[styles.segmentText, on && { color: colors.bg }]}>{option.label}</Text>
            {option.hint ? <Text style={[styles.segmentHint, on && { color: tint(colors.bg, 0.7) }]}>{option.hint}</Text> : null}
          </Pressable>
        )
      })}
    </View>
  )
}

// ---------- Данные ----------

export function Chip({ children, color, icon }: PropsWithChildren<{ color?: string; icon?: IconName }>) {
  const c = color ?? colors.soft
  return (
    <View style={[styles.chip, { backgroundColor: tint(c, 0.12), borderColor: tint(c, color ? 0.3 : 0.18) }]}>
      {icon ? <Ionicons name={icon} size={13} color={c} /> : null}
      <Text style={[styles.chipText, { color: c }]}>{children}</Text>
    </View>
  )
}

export function ProgressBar({ value, color = colors.accent, height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${Math.max(0, Math.min(1, value)) * 100}%`, backgroundColor: color }]} />
    </View>
  )
}

export function Ring({
  value,
  size = 64,
  stroke = 7,
  color = colors.accent,
  children,
}: PropsWithChildren<{ value: number; size?: number; stroke?: number; color?: string }>) {
  const r = (size - stroke) / 2
  const length = Math.PI * 2 * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={[StyleSheet.absoluteFill, { transform: [{ rotate: '-90deg' }] }]}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tint(color, 0.16)} strokeWidth={stroke} />
        {v > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${length} ${length}`}
            strokeDashoffset={length * (1 - v)}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  )
}

export function Stat({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Txt v="muted">{label}</Txt>
      <Text style={[styles.statValue, color ? { color } : null]}>
        {value}
        {unit ? <Text style={styles.statUnit}> {unit}</Text> : null}
      </Text>
    </View>
  )
}

export function Bullet({ children, color = colors.accent, icon }: PropsWithChildren<{ color?: string; icon?: IconName }>) {
  return (
    <View style={styles.bullet}>
      {icon ? (
        <Ionicons name={icon} size={18} color={color} style={{ marginTop: 1 }} />
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Txt v="soft" style={{ flex: 1 }}>
        {children}
      </Txt>
    </View>
  )
}

export function NumberedSteps({ steps, color = colors.accent }: { steps: string[]; color?: string }) {
  return (
    <View style={{ gap: 12 }}>
      {steps.map((step, index) => (
        <View key={index} style={styles.bullet}>
          <View style={[styles.stepNumber, { backgroundColor: tint(color, 0.14) }]}>
            <Text style={[styles.stepNumberText, { color }]}>{index + 1}</Text>
          </View>
          <Txt style={{ flex: 1 }}>{step}</Txt>
        </View>
      ))}
    </View>
  )
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  )
}

export const layout = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gap: { gap: 10 },
  stack: { gap: 12 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 12 },
})

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  screen: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 28 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4, minHeight: 48 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginHorizontal: 4 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  hero: { borderRadius: radius.xl, padding: 20, borderWidth: 1, overflow: 'hidden', backgroundColor: colors.card },
  banner: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: radius.lg, borderWidth: 1 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSm: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.sm },
  buttonLg: { minHeight: 58, borderRadius: 18 },
  buttonSecondary: { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.line },
  buttonText: { fontFamily: fonts.semibold, fontSize: 15 },
  iconButton: { alignItems: 'center', justifyContent: 'center' },
  segmented: { flexDirection: 'row', padding: 4, borderRadius: 18, backgroundColor: colors.card, gap: 4 },
  segment: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  segmentText: { color: colors.soft, fontFamily: fonts.semibold, fontSize: 14 },
  segmentHint: { color: colors.mute, fontFamily: fonts.regular, fontSize: 11, marginTop: 1 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  chipText: { fontFamily: fonts.semibold, fontSize: 12 },
  track: { backgroundColor: colors.elevated, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  statValue: { color: colors.text, fontFamily: fonts.bold, fontSize: 24, marginTop: 4, fontVariant: ['tabular-nums'] },
  statUnit: { color: colors.mute, fontFamily: fonts.medium, fontSize: 13 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  stepNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: fonts.bold, fontSize: 12 },
})
