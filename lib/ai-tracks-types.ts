import type {
  AiTracksDirectionId,
  AiTracksMode,
  AiTracksMoodId,
  AiTracksVocalId,
} from "@/lib/ai-tracks-config"

export type AiTracksJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "RECONCILING"
  | "TRANSFERRING"
  | "SUCCEEDED"
  | "FAILED"

export type AiTracksSettingsSnapshot = {
  mode: AiTracksMode
  idea: string
  title: string
  lyrics: string
  style: string
  mood: AiTracksMoodId | null
  vocal: AiTracksVocalId
  instrumental: boolean
  direction: AiTracksDirectionId | null
  weirdnessPct: number
  styleWeightPct: number
}

export type AiTracksDraft = AiTracksSettingsSnapshot

export const DEFAULT_AI_TRACKS_DRAFT: AiTracksDraft = {
  mode: "simple",
  idea: "",
  title: "",
  lyrics: "",
  style: "",
  mood: null,
  vocal: "auto",
  instrumental: false,
  direction: null,
  weirdnessPct: 50,
  styleWeightPct: 65,
}

export type AiTracksResultDto = {
  id: string
  jobId: string
  variantIndex: number
  variantLabel: string
  title: string
  durationSec: number | null
  audioUrl: string | null
  coverUrl: string | null
  audioFormat: string | null
  isFavorite: boolean
  modelLabel: string
  directionLabel: string | null
  createdAt: string
}

export type AiTracksJobDto = {
  id: string
  status: AiTracksJobStatus
  mode: AiTracksMode
  settings: AiTracksSettingsSnapshot
  provider: string
  modelId: string
  modelLabel: string
  costAttempts: number
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  results: AiTracksResultDto[]
}

export type AiTracksStatusMessageKey =
  | "empty_results"
  | "empty_favorites"
  | "missing_idea"
  | "missing_lyrics"
  | "missing_instrumental_style"
  | "generating"
  | "reconciling"
  | "transferring"
  | "failed_refunded"
  | "no_attempts"
  | "service_unavailable"

export const AI_TRACKS_STATUS_MESSAGES: Record<AiTracksStatusMessageKey, string> = {
  empty_results: "Здесь появятся ваши треки. Опишите идею и создайте первый вариант.",
  empty_favorites: "Добавьте понравившийся вариант в избранное - он появится здесь.",
  missing_idea: "Опишите идею песни.",
  missing_lyrics: "Добавьте текст песни или выберите инструментальную музыку.",
  missing_instrumental_style: "Опишите звучание инструментальной музыки.",
  generating: "Создаём вашу музыку. Результат появится здесь.",
  reconciling: "Проверяем состояние генерации. Повторный запуск пока не требуется.",
  transferring: "Сохраняем готовые треки.",
  failed_refunded: "Не удалось завершить генерацию. Попытка возвращена.",
  no_attempts: "Попытки закончились.",
  service_unavailable: "Генерация временно недоступна. Попробуйте позже.",
}

export const AI_TRACKS_EXAMPLE_LYRICS = `Куплет 1:
Ночной город в окнах проезжает мимо,
Огни рисуют карту новых маршрутов.

Припев:
Держи ритм, не отпускай этот момент,
Пусть песня звучит, пока мы в пути.
`
