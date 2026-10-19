import {
  AI_TRACKS_DIRECTIONS,
  AI_TRACKS_LIMITS,
  AI_TRACKS_MODEL_ID,
  AI_TRACKS_MOODS,
  AI_TRACKS_VOCALS,
  isAiTracksModelId,
  type AiTracksDirectionId,
  type AiTracksModelId,
  type AiTracksMoodId,
  type AiTracksVocalId,
} from "@/lib/ai-tracks-config"
import {
  AI_TRACKS_STATUS_MESSAGES,
  DEFAULT_AI_TRACKS_DRAFT,
  type AiTracksDraft,
  type AiTracksSettingsSnapshot,
} from "@/lib/ai-tracks-types"

export type AiTracksValidationError = {
  field: "idea" | "lyrics" | "style" | "title" | "form"
  message: string
}

function clampPct(n: unknown, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.min(100, Math.max(0, Math.round(v)))
}

function asMood(v: unknown): AiTracksMoodId | null {
  if (v == null || v === "") return null
  const id = String(v)
  return AI_TRACKS_MOODS.some((m) => m.id === id) ? (id as AiTracksMoodId) : null
}

function asVocal(v: unknown): AiTracksVocalId {
  const id = String(v ?? "auto")
  return AI_TRACKS_VOCALS.some((m) => m.id === id) ? (id as AiTracksVocalId) : "auto"
}

function asDirection(v: unknown): AiTracksDirectionId | null {
  if (v == null || v === "") return null
  const id = String(v)
  return AI_TRACKS_DIRECTIONS.some((m) => m.id === id) ? (id as AiTracksDirectionId) : null
}

export function normalizeAiTracksDraft(input: unknown): AiTracksDraft {
  const raw = input && typeof input === "object" ? (input as Record<string, unknown>) : {}
  const mode = raw.mode === "advanced" ? "advanced" : "simple"
  const modelId: AiTracksModelId = isAiTracksModelId(raw.modelId)
    ? raw.modelId
    : AI_TRACKS_MODEL_ID
  const idea = typeof raw.idea === "string" ? raw.idea : ""
  const title = typeof raw.title === "string" ? raw.title : ""
  const lyrics = typeof raw.lyrics === "string" ? raw.lyrics : ""
  const style = typeof raw.style === "string" ? raw.style : ""
  const instrumental = raw.instrumental === true

  return {
    mode,
    modelId,
    idea: idea.slice(0, AI_TRACKS_LIMITS.ideaMax),
    title: title.slice(0, AI_TRACKS_LIMITS.titleMax),
    lyrics: lyrics.slice(0, AI_TRACKS_LIMITS.lyricsMax),
    style: style.slice(0, AI_TRACKS_LIMITS.styleMax),
    mood: asMood(raw.mood),
    vocal: asVocal(raw.vocal),
    instrumental,
    direction: asDirection(raw.direction),
    weirdnessPct: clampPct(raw.weirdnessPct, DEFAULT_AI_TRACKS_DRAFT.weirdnessPct),
    styleWeightPct: clampPct(raw.styleWeightPct, DEFAULT_AI_TRACKS_DRAFT.styleWeightPct),
  }
}

export function validateAiTracksDraft(draft: AiTracksDraft): AiTracksValidationError[] {
  const errors: AiTracksValidationError[] = []

  if (draft.mode === "simple") {
    if (!draft.idea.trim()) {
      errors.push({ field: "idea", message: AI_TRACKS_STATUS_MESSAGES.missing_idea })
    }
  } else if (draft.instrumental) {
    if (!draft.style.trim()) {
      errors.push({
        field: "style",
        message: AI_TRACKS_STATUS_MESSAGES.missing_instrumental_style,
      })
    }
  } else {
    if (!draft.lyrics.trim()) {
      errors.push({ field: "lyrics", message: AI_TRACKS_STATUS_MESSAGES.missing_lyrics })
    }
    if (!draft.style.trim()) {
      errors.push({
        field: "style",
        message: "Опишите, как должна звучать музыка.",
      })
    }
  }

  return errors
}

/** Собирает текстовое описание для будущей модели: идея пользователя + мягкие подсказки. */
export function buildPromptParts(draft: AiTracksDraft): {
  prompt: string
  lyrics: string | null
  title: string | null
  instrumental: boolean
} {
  const mood = AI_TRACKS_MOODS.find((m) => m.id === draft.mood)
  const direction = AI_TRACKS_DIRECTIONS.find((d) => d.id === draft.direction)
  const vocal =
    !draft.instrumental && draft.vocal !== "auto"
      ? AI_TRACKS_VOCALS.find((v) => v.id === draft.vocal)
      : null

  const hints: string[] = []
  if (direction?.promptHint) hints.push(direction.promptHint)
  if (mood?.promptHint) hints.push(mood.promptHint)
  if (vocal?.promptHint) hints.push(vocal.promptHint)

  const mergeHints = (base: string) => {
    const trimmed = base.trim()
    const lower = trimmed.toLowerCase()
    const missing = hints.filter((h) => h && !lower.includes(h.toLowerCase()))
    if (!missing.length) return trimmed
    return trimmed ? `${trimmed}. ${missing.join(", ")}` : missing.join(", ")
  }

  if (draft.mode === "simple") {
    return {
      prompt: mergeHints(draft.idea),
      lyrics: null,
      title: draft.title.trim() || null,
      instrumental: draft.instrumental,
    }
  }

  return {
    prompt: mergeHints(draft.style),
    lyrics: draft.instrumental ? null : draft.lyrics,
    title: draft.title.trim() || null,
    instrumental: draft.instrumental,
  }
}

export function toSettingsSnapshot(draft: AiTracksDraft): AiTracksSettingsSnapshot {
  return {
    mode: draft.mode,
    modelId: draft.modelId,
    idea: draft.idea,
    title: draft.title,
    lyrics: draft.lyrics,
    style: draft.style,
    mood: draft.mood,
    vocal: draft.vocal,
    instrumental: draft.instrumental,
    direction: draft.direction,
    weirdnessPct: draft.weirdnessPct,
    styleWeightPct: draft.styleWeightPct,
  }
}
