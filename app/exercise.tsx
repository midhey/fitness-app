import { StyleSheet, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { EXERCISES } from '@/src/data/exercises'
import { MUSCLE_NAMES } from '@/src/data/muscles'
import { ExerciseIllustration } from '@/src/illustrations/ExerciseIllustration'
import { Banner, Bullet, Button, Card, Chip, Header, IconButton, NumberedSteps, Screen, SectionTitle, Txt } from '@/src/native/ui'
import { colors } from '@/src/native/theme'

export default function ExerciseScreen() {
  const params = useLocalSearchParams<{ id?: string; week?: string }>()
  const exercise = params.id ? EXERCISES[params.id] : undefined
  const week = Number(params.week)
  const close = <IconButton icon="close" label="Закрыть" onPress={() => router.back()} />
  if (!exercise)
    return (
      <Screen>
        <Header title="Упражнение не найдено" right={close} />
      </Screen>
    )
  const note = Number.isFinite(week) ? exercise.weekNotes?.[week] : undefined
  const implement =
    exercise.implement === 'pair'
      ? 'две гантели · вес одной'
      : exercise.implement === 'one'
        ? 'одна гантель'
        : exercise.implement === 'barbell'
          ? 'штанга'
          : 'без веса'
  return (
    <Screen>
      <Header eyebrow={implement} title={exercise.name} right={close} />
      <ExerciseIllustration id={exercise.id} />
      <View style={styles.chips}>
        {exercise.primary.map((muscle) => (
          <Chip key={muscle} color={colors.accent}>
            {MUSCLE_NAMES[muscle]}
          </Chip>
        ))}
        {exercise.secondary.map((muscle) => (
          <Chip key={muscle}>{MUSCLE_NAMES[muscle]}</Chip>
        ))}
      </View>
      {exercise.alt ? (
        <Button
          title={`${exercise.implement === 'barbell' ? 'С гантелями' : 'Со штангой'}: ${EXERCISES[exercise.alt].short}`}
          tone="secondary"
          icon="swap-horizontal"
          onPress={() => router.replace({ pathname: '/exercise', params: { id: exercise.alt!, week: params.week ?? '' } })}
        />
      ) : null}
      {note ? (
        <Banner icon="trending-up" color={colors.accent} title={`Неделя ${week}`}>
          {note}
        </Banner>
      ) : null}

      <SectionTitle>Исходное положение</SectionTitle>
      <Card>
        <Txt>{exercise.setup}</Txt>
        {exercise.startWeight ? (
          <Txt v="muted" style={{ marginTop: 10 }}>
            Ориентир для старта: {exercise.startWeight}
          </Txt>
        ) : null}
      </Card>

      <SectionTitle>Как выполнять</SectionTitle>
      <Card>
        <NumberedSteps steps={exercise.steps} />
      </Card>
      {exercise.tips?.map((tip, index) => (
        <Banner key={index} icon="information-circle-outline" title="Подсказка">
          {tip}
        </Banner>
      ))}

      <SectionTitle>Типичные ошибки</SectionTitle>
      <Card style={{ gap: 10 }}>
        {exercise.mistakes.map((mistake, index) => (
          <Bullet key={index} icon="close-circle-outline" color={colors.danger}>
            {mistake}
          </Bullet>
        ))}
      </Card>

      <SectionTitle>Когда вес упёрся в предел</SectionTitle>
      <Card style={{ gap: 10 }}>
        {exercise.progression.map((item, index) => (
          <Bullet key={index} icon="arrow-forward" color={colors.accent}>
            {item}
          </Bullet>
        ))}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
})
