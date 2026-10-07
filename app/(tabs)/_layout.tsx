import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '@/src/native/theme'

const icons: Record<string, keyof typeof Ionicons.glyphMap> = { index: 'home', plan: 'barbell', posture: 'body', progress: 'stats-chart' }
export default function TabsLayout() {
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.mute,
    tabBarStyle: { position: 'absolute', height: 82, paddingTop: 8, paddingBottom: 20, backgroundColor: '#111518F5', borderTopColor: colors.line },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />,
  })}>
    <Tabs.Screen name="index" options={{ title: 'Сегодня' }} />
    <Tabs.Screen name="plan" options={{ title: 'План' }} />
    <Tabs.Screen name="posture" options={{ title: 'Осанка' }} />
    <Tabs.Screen name="progress" options={{ title: 'Прогресс' }} />
  </Tabs>
}
