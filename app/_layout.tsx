import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import * as SystemUI from 'expo-system-ui'
import { NavigationBar } from 'expo-navigation-bar'
import { useFonts } from 'expo-font'
// Только используемые начертания: импорт из корня пакета тянет в bundle все девять
import { Onest_400Regular } from '@expo-google-fonts/onest/400Regular'
import { Onest_500Medium } from '@expo-google-fonts/onest/500Medium'
import { Onest_600SemiBold } from '@expo-google-fonts/onest/600SemiBold'
import { Onest_700Bold } from '@expo-google-fonts/onest/700Bold'
import { Onest_800ExtraBold } from '@expo-google-fonts/onest/800ExtraBold'
import { initializeStore } from '@/src/store/store'
import { colors } from '@/src/native/theme'

SplashScreen.preventAutoHideAsync()
SystemUI.setBackgroundColorAsync(colors.bg)

export default function RootLayout() {
  const [storeReady, setStoreReady] = useState(false)
  const [fontsLoaded, fontError] = useFonts({ Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold })
  const ready = storeReady && (fontsLoaded || !!fontError)

  useEffect(() => {
    initializeStore().finally(() => setStoreReady(true))
  }, [])
  useEffect(() => {
    if (ready) SplashScreen.hideAsync()
  }, [ready])

  // Пока не готово — остаётся splash screen того же цвета, без вспышек
  if (!ready) return null
  return (
    <>
      <StatusBar style="light" />
      <NavigationBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout" options={{ gestureEnabled: false }} />
        <Stack.Screen name="cardio" />
        <Stack.Screen name="posture-session" options={{ gestureEnabled: false }} />
        <Stack.Screen name="exercise" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="weight" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="profile" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  )
}
