import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { NavigationBar } from 'expo-navigation-bar'
import { initializeStore } from '@/src/store/store'
import { colors } from '@/src/native/theme'
import { Loading } from '@/src/native/ui'

SplashScreen.preventAutoHideAsync()
SystemUI.setBackgroundColorAsync(colors.bg)

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  useEffect(() => { initializeStore().finally(() => { setReady(true); SplashScreen.hideAsync() }) }, [])
  if (!ready) return <Loading />
  return <>
    <StatusBar style="light" />
    <NavigationBar style="dark" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="workout" options={{ gestureEnabled: false }} />
      <Stack.Screen name="cardio" />
      <Stack.Screen name="posture-session" />
      <Stack.Screen name="exercise" options={{ presentation: 'modal' }} />
      <Stack.Screen name="weight" options={{ presentation: 'modal' }} />
      <Stack.Screen name="profile" options={{ presentation: 'modal' }} />
    </Stack>
  </>
}
