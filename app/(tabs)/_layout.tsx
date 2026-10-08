import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts, tint } from '@/src/native/theme'
import { tap } from '@/src/native/feedback'
import type { IconName } from '@/src/native/ui'

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0]

const TABS: Record<string, { title: string; icon: IconName; iconOn: IconName; color: string }> = {
  index: { title: 'Сегодня', icon: 'today-outline', iconOn: 'today', color: colors.accent },
  plan: { title: 'План', icon: 'barbell-outline', iconOn: 'barbell', color: colors.accent },
  posture: { title: 'Осанка', icon: 'body-outline', iconOn: 'body', color: colors.posture },
  progress: { title: 'Прогресс', icon: 'stats-chart-outline', iconOn: 'stats-chart', color: colors.accent },
}

/** Плавающая панель вкладок: активная вкладка подсвечена «таблеткой» цвета раздела */
function TabBar({ state, navigation, insets }: TabBarProps) {
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name]
          if (!tab) return null
          const focused = state.index === index
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
            if (!focused && !event.defaultPrevented) {
              tap()
              navigation.navigate(route.name)
            }
          }
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.title}
              style={[styles.item, focused && { backgroundColor: tint(tab.color, 0.14) }]}
            >
              <Ionicons name={focused ? tab.iconOn : tab.icon} size={21} color={focused ? tab.color : colors.mute} />
              <Text style={[styles.label, { color: focused ? tab.color : colors.mute }]} numberOfLines={1}>
                {tab.title}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="plan" />
      <Tabs.Screen name="posture" />
      <Tabs.Screen name="progress" />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 14 },
  bar: {
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    borderRadius: 26,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.raised,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  item: { flex: 1, height: 54, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { fontFamily: fonts.semibold, fontSize: 11 },
})
