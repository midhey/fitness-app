import { useEffect } from 'react'
import { useRoute } from './lib/router'
import { clearToast, useToast } from './lib/toast'
import { TabBar } from './components/TabBar'
import { Toast } from './components/ui'
import { Home } from './screens/Home'
import { Plan } from './screens/Plan'
import { Posture } from './screens/Posture'
import { PostureSession } from './screens/PostureSession'
import { Progress } from './screens/Progress'
import { Workout } from './screens/Workout'
import { Cardio } from './screens/Cardio'

export function App() {
  const route = useRoute()
  const toast = useToast()

  // Новый экран всегда открывается с начала (в т. ч. по системной кнопке «Назад»)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])
  const tabbed = route === 'home' || route === 'plan' || route === 'posture' || route === 'progress'

  return (
    <div className="min-h-dvh bg-bg">
      <main className={`mx-auto max-w-lg px-4 ${tabbed ? 'safe-top pb-28' : 'pb-8'}`}>
        {route === 'home' && <Home />}
        {route === 'plan' && <Plan />}
        {route === 'posture' && <Posture />}
        {route === 'progress' && <Progress />}
        {route === 'workout' && <Workout />}
        {route === 'cardio' && <Cardio />}
        {route === 'posture-session' && <PostureSession />}
      </main>
      {tabbed && <TabBar route={route} />}
      <Toast text={toast} onDone={clearToast} />
    </div>
  )
}
