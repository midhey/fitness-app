export const colors = {
  bg: '#0A0C0E',
  card: '#14181B',
  elevated: '#1C2125',
  raised: '#232A2F',
  line: '#262D32',
  text: '#F3F6F4',
  soft: '#A6B0AA',
  mute: '#6C7670',
  accent: '#C4F36A',
  accentInk: '#142005',
  cardio: '#6FD3FF',
  posture: '#B9A2FF',
  danger: '#FF7A7A',
  warn: '#FFC861',
}

/** Начертания Onest. На Android кастомный шрифт не подбирает вес по fontWeight — нужен отдельный fontFamily. */
export const fonts = {
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  semibold: 'Onest_600SemiBold',
  bold: 'Onest_700Bold',
  heavy: 'Onest_800ExtraBold',
}

export const radius = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 }

/** Полупрозрачный оттенок цвета: alpha 0–1 */
export const tint = (hex: string, alpha: number) =>
  hex +
  Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
