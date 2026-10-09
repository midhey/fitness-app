import { Alert, View } from 'react-native'
import { acceptFreshStart, dismissStorageIssue, retryLoad, useStorageIssue } from '../store/store'
import { colors } from './theme'
import { Banner, Button } from './ui'

/** Предупреждение о проблеме с хранилищем данных */
export function StorageBanner() {
  const issue = useStorageIssue()
  if (!issue) return null
  if (issue.kind === 'recovered')
    return (
      <Banner
        icon="shield-checkmark-outline"
        color={colors.posture}
        title="Данные восстановлены из резервной копии"
        action={
          <Button
            title="Понятно"
            size="sm"
            tone="secondary"
            onPress={dismissStorageIssue}
            style={{ alignSelf: 'flex-start', marginTop: 8 }}
          />
        }
      >
        Основное хранилище не прочиталось, поэтому приложение использовало последнюю исправную копию на устройстве.
      </Banner>
    )
  if (issue.kind === 'read')
    return (
      <Banner
        icon="warning-outline"
        color={colors.danger}
        title="Не удалось прочитать сохранённые данные"
        action={
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button title="Повторить" size="sm" tone="secondary" onPress={() => retryLoad()} />
            <Button
              title="Начать заново"
              size="sm"
              tone="ghost"
              onPress={() =>
                Alert.alert('Начать заново?', 'Если данные на устройстве ещё есть, они будут перезаписаны.', [
                  { text: 'Отмена', style: 'cancel' },
                  { text: 'Начать заново', style: 'destructive', onPress: acceptFreshStart },
                ])
              }
            />
          </View>
        }
      >
        Изменения пока не сохраняются, чтобы не затереть записи. Попробуй ещё раз или перезапусти приложение.
      </Banner>
    )
  if (issue.kind === 'corrupt')
    return (
      <Banner
        icon="alert-circle-outline"
        title="Сохранённые данные повреждены"
        action={
          <Button
            title="Понятно"
            size="sm"
            tone="secondary"
            onPress={dismissStorageIssue}
            style={{ alignSelf: 'flex-start', marginTop: 8 }}
          />
        }
      >
        Приложение начало с чистого листа. Исходная копия сохранена на устройстве под ключом {issue.backupKey}.
      </Banner>
    )
  return (
    <Banner icon="cloud-offline-outline" title="Не удалось сохранить изменения">
      Последние записи пока только в памяти. Освободи место на устройстве — сохранение повторится при следующем действии.
    </Banner>
  )
}
