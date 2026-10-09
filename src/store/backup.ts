import { Directory, File, Paths } from 'expo-file-system'
import type { AppState } from '../types'

const FORMAT = 'homefit.backup'
const BACKUP_VERSION = 1
const KEEP_DAILY_BACKUPS = 7
const BACKUP_PREFIX = 'homefit-'
const LATEST_NAME = 'homefit-latest.json'

export interface BackupFile {
  format: typeof FORMAT
  backupVersion: typeof BACKUP_VERSION
  exportedAt: string
  data: AppState
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/** Проверяет контейнер бэкапа до передачи данных в store. */
export function parseBackup(raw: string): BackupFile {
  const parsed: unknown = JSON.parse(raw)
  if (
    !isObject(parsed) ||
    parsed.format !== FORMAT ||
    parsed.backupVersion !== BACKUP_VERSION ||
    typeof parsed.exportedAt !== 'string' ||
    !isObject(parsed.data) ||
    parsed.data.version !== 1 ||
    !isObject(parsed.data.profile) ||
    !isObject(parsed.data.settings) ||
    !Array.isArray(parsed.data.weights) ||
    !Array.isArray(parsed.data.workouts) ||
    !Array.isArray(parsed.data.cardio) ||
    !Array.isArray(parsed.data.posture)
  ) {
    throw new Error('Файл не похож на резервную копию «Домашней формы».')
  }
  return parsed as unknown as BackupFile
}

export function serializeBackup(data: AppState): string {
  const backup: BackupFile = { format: FORMAT, backupVersion: BACKUP_VERSION, exportedAt: new Date().toISOString(), data }
  return JSON.stringify(backup, null, 2)
}

function backupDirectory() {
  const directory = new Directory(Paths.document, 'homefit-backups')
  directory.create({ idempotent: true, intermediates: true })
  return directory
}

function writeFile(file: File, contents: string) {
  if (!file.exists) file.create({ intermediates: true })
  file.write(contents)
}

let backupQueue = Promise.resolve()

/** Обновляет latest и хранит до семи дневных снимков. */
export function writeAutomaticBackup(data: AppState): Promise<void> {
  const run = backupQueue.then(() => {
    const directory = backupDirectory()
    const contents = serializeBackup(data)
    writeFile(new File(directory, LATEST_NAME), contents)

    const day = new Date().toISOString().slice(0, 10)
    writeFile(new File(directory, `${BACKUP_PREFIX}${day}.json`), contents)

    const snapshots = directory
      .list()
      .filter((item): item is File => item instanceof File && item.name.startsWith(BACKUP_PREFIX) && item.name !== LATEST_NAME)
      .sort((a, b) => b.name.localeCompare(a.name))
    for (const old of snapshots.slice(KEEP_DAILY_BACKUPS)) old.delete()
  })
  backupQueue = run.catch(() => {})
  return run
}

/** Возвращает последнюю внутреннюю копию, если она существует и читается. */
export async function readAutomaticBackup(): Promise<BackupFile | null> {
  try {
    const latest = new File(backupDirectory(), LATEST_NAME)
    if (!latest.exists) return null
    return parseBackup(await latest.text())
  } catch {
    return null
  }
}

/** Создаёт временный файл для системного меню «Поделиться / Сохранить в файлы». */
export function createExportFile(data: AppState): File {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const file = new File(Paths.cache, `homefit-backup-${stamp}.json`)
  writeFile(file, serializeBackup(data))
  return file
}
