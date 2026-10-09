"use client"

import { CircleHelp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  GENRES,
  TRACK_LYRICS_LANGUAGES,
  TRACK_MOODS,
  musicRightsRequiresAiService,
} from "@/lib/track-constants"
import type { Track } from "@/lib/tracks"
import type { TrackAiLabeling } from "@/lib/track-ai-labeling"
import { TrackAiLabelingFields } from "@/components/cabinet/upload/track-ai-labeling-fields"
import type { TrackDraftPatch } from "@/components/cabinet/upload/track-metadata-fields"
import { wizardFieldId } from "@/lib/cabinet-wizard-field-focus"
import { cn } from "@/lib/utils"

/** Поля, вынесенные в блок общих для альбома (для фокуса валидации). */
export const ALBUM_SHARED_METADATA_FIELDS = new Set([
  "genre",
  "mood",
  "musicAuthor",
  "musicRights",
  "musicAiService",
  "lyricsLanguage",
  "hasExplicitLanguage",
  "lyricsRights",
  "performanceRights",
  "previousDistributor",
  "originalReleaseDate",
])

export function albumSharedFieldId(field: string): string {
  return wizardFieldId(`album-shared-${field}`)
}

const MUSIC_RIGHTS_OPTIONS = [
  "Музыка написана мной. Есть проект",
  "Сгенерирована в ИИ (платно)",
  "Сгенерирована в ИИ (бесплатно)",
  "Купил музыку. Есть договор/чек",
  "Скачал в интернете бесплатно",
] as const

const LYRICS_RIGHTS_OPTIONS = [
  "Являюсь автором текста",
  "Является общественным достоянием",
  "Текст сгенерирован ИИ",
  "Купил текст. Есть договор/чек",
  "Скачал в интернете бесплатно",
] as const

const PERFORMANCE_RIGHTS_OPTIONS = [
  "Являюсь исполнителем песни",
  "Исполнитель ИИ",
  "Исполнитель другой человек. Являюсь правообладалетелем",
] as const

function unanimous<T>(tracks: Track[], get: (t: Track) => T): T | undefined {
  if (tracks.length === 0) return undefined
  const first = get(tracks[0])
  return tracks.every((t) => Object.is(get(t), first)) ? first : undefined
}

function StableSelect({
  value,
  onValueChange,
  disabled,
  placeholder,
  mixedPlaceholder = "Разные значения",
  options,
}: {
  value: string | undefined
  onValueChange: (v: string) => void
  disabled?: boolean
  placeholder: string
  mixedPlaceholder?: string
  options: readonly string[]
}) {
  const mixed = value === undefined
  return (
    <Select
      value={mixed ? undefined : value || undefined}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full", mixed && "text-muted-foreground")}>
        <SelectValue placeholder={mixed ? mixedPlaceholder : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type AlbumSharedMetadataFieldsProps = {
  tracks: Track[]
  onApply: (patch: TrackDraftPatch) => void
  disabled?: boolean
}

export function AlbumSharedMetadataFields({
  tracks,
  onApply,
  disabled,
}: AlbumSharedMetadataFieldsProps) {
  const genre = unanimous(tracks, (t) => t.genre)
  const mood = unanimous(tracks, (t) => t.mood)
  const musicAuthor = unanimous(tracks, (t) => t.musicAuthor)
  const musicRights = unanimous(tracks, (t) => t.musicRights)
  const musicAiService = unanimous(tracks, (t) => t.musicAiService)
  const lyricsLanguage = unanimous(tracks, (t) => t.lyricsLanguage)
  const hasExplicitLanguage = unanimous(tracks, (t) => t.hasExplicitLanguage)
  const lyricsRights = unanimous(tracks, (t) => t.lyricsRights)
  const performanceRights = unanimous(tracks, (t) => t.performanceRights)
  const transfer = unanimous(tracks, (t) => t.transferFromOtherDistributor === true)
  const previousDistributor = unanimous(tracks, (t) => t.previousDistributor ?? "")
  const originalReleaseDate = unanimous(tracks, (t) => t.originalReleaseDate ?? "")

  const showAiService = musicRightsRequiresAiService(musicRights ?? "")
  const transferOn = transfer === true

  return (
    <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold">Общие поля альбома</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Эти значения применяются сразу ко всем трекам. У каждого трека ниже остаются название,
          текст, версия и индивидуальные поля.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div data-wizard-field={albumSharedFieldId("genre")}>
          <Label>Жанр *</Label>
          <StableSelect
            value={genre}
            onValueChange={(v) => onApply({ genre: v as Track["genre"] })}
            disabled={disabled}
            placeholder="Выберите жанр"
            options={GENRES}
          />
        </div>
        <div data-wizard-field={albumSharedFieldId("mood")}>
          <Label>Настроение *</Label>
          <StableSelect
            value={mood}
            onValueChange={(v) => onApply({ mood: v as Track["mood"] })}
            disabled={disabled}
            placeholder="Выберите настроение"
            options={TRACK_MOODS}
          />
        </div>

        <div data-wizard-field={albumSharedFieldId("musicAuthor")}>
          <Label>
            Автор музыки *
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="ml-1.5 inline-flex align-middle text-muted-foreground hover:text-foreground"
                  aria-label="Подсказка: Автор музыки"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-balance">
                Указывается полное ФИО человека. ИИ не может быть автором, если вам помогала
                нейросеть, автором всё равно указывается человек
              </TooltipContent>
            </Tooltip>
          </Label>
          <Input
            value={musicAuthor ?? ""}
            placeholder={musicAuthor === undefined ? "Разные значения" : undefined}
            onChange={(e) => onApply({ musicAuthor: e.target.value })}
            disabled={disabled}
            maxLength={100}
          />
        </div>
        <div data-wizard-field={albumSharedFieldId("musicRights")}>
          <Label>Права на музыку *</Label>
          <StableSelect
            value={musicRights}
            onValueChange={(v) =>
              onApply({
                musicRights: v,
                ...(!musicRightsRequiresAiService(v) ? { musicAiService: "" } : {}),
              })
            }
            disabled={disabled}
            placeholder="Выберите"
            options={MUSIC_RIGHTS_OPTIONS}
          />
        </div>

        {showAiService ? (
          <div className="sm:col-span-2" data-wizard-field={albumSharedFieldId("musicAiService")}>
            <Label>ИИ-сервис (название или ссылка) *</Label>
            <Input
              value={musicAiService ?? ""}
              placeholder={musicAiService === undefined ? "Разные значения" : undefined}
              onChange={(e) => onApply({ musicAiService: e.target.value })}
              disabled={disabled}
              maxLength={500}
            />
          </div>
        ) : null}

        <div data-wizard-field={albumSharedFieldId("lyricsLanguage")}>
          <Label>Язык текста *</Label>
          <StableSelect
            value={lyricsLanguage}
            onValueChange={(v) => onApply({ lyricsLanguage: v })}
            disabled={disabled}
            placeholder="Выберите"
            options={TRACK_LYRICS_LANGUAGES}
          />
        </div>
        <div data-wizard-field={albumSharedFieldId("hasExplicitLanguage")}>
          <Label>Ненормативная лексика *</Label>
          <Select
            value={
              hasExplicitLanguage === true
                ? "yes"
                : hasExplicitLanguage === false
                  ? "no"
                  : undefined
            }
            onValueChange={(v) => onApply({ hasExplicitLanguage: v === "yes" })}
            disabled={disabled}
          >
            <SelectTrigger
              className={cn(
                "w-full",
                hasExplicitLanguage === undefined && "text-muted-foreground",
              )}
            >
              <SelectValue
                placeholder={
                  hasExplicitLanguage === undefined ? "Разные значения" : "Выберите"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Да</SelectItem>
              <SelectItem value="no">Нет</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div data-wizard-field={albumSharedFieldId("lyricsRights")}>
          <Label>Права на текст *</Label>
          <StableSelect
            value={lyricsRights}
            onValueChange={(v) => onApply({ lyricsRights: v })}
            disabled={disabled}
            placeholder="Выберите"
            options={LYRICS_RIGHTS_OPTIONS}
          />
        </div>
        <div data-wizard-field={albumSharedFieldId("performanceRights")}>
          <Label>Права на исполнение *</Label>
          <StableSelect
            value={performanceRights}
            onValueChange={(v) => onApply({ performanceRights: v })}
            disabled={disabled}
            placeholder="Выберите"
            options={PERFORMANCE_RIGHTS_OPTIONS}
          />
        </div>

        <div className="sm:col-span-2 flex items-start gap-2">
          <Checkbox
            id="album-shared-transfer"
            className="mt-0.5"
            checked={transferOn}
            onCheckedChange={(c) =>
              onApply({
                transferFromOtherDistributor: c === true,
                ...(c === true
                  ? {}
                  : { previousDistributor: null, originalReleaseDate: null }),
              })
            }
            disabled={disabled}
          />
          <div className="space-y-1">
            <Label htmlFor="album-shared-transfer" className="cursor-pointer font-normal">
              Перенос от другого дистрибьютора
            </Label>
            <p className="text-xs text-muted-foreground">
              Отметьте, если альбом уже был на площадках у другого дистрибьютора - применится ко
              всем трекам
              {transfer === undefined ? " (сейчас у треков разные значения)" : ""}
            </p>
          </div>
        </div>

        {transferOn ? (
          <>
            <div
              className="sm:col-span-2 max-w-md"
              data-wizard-field={albumSharedFieldId("previousDistributor")}
            >
              <Label>Предыдущий дистрибьютор *</Label>
              <Input
                value={previousDistributor ?? ""}
                placeholder={
                  previousDistributor === undefined ? "Разные значения" : "Название дистрибьютора"
                }
                onChange={(e) => onApply({ previousDistributor: e.target.value })}
                disabled={disabled}
                maxLength={100}
              />
            </div>
            <div
              className="sm:col-span-2 max-w-md"
              data-wizard-field={albumSharedFieldId("originalReleaseDate")}
            >
              <Label htmlFor="album-shared-original-date">Оригинальная дата релиза *</Label>
              <Input
                id="album-shared-original-date"
                type="date"
                value={
                  originalReleaseDate && /^\d{4}-\d{2}-\d{2}/.test(originalReleaseDate)
                    ? originalReleaseDate.slice(0, 10)
                    : ""
                }
                onChange={(e) =>
                  onApply({ originalReleaseDate: e.target.value || null })
                }
                disabled={disabled}
              />
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}

type AlbumSharedAiLabelingFieldsProps = {
  tracks: Track[]
  onApply: (aiLabeling: TrackAiLabeling) => void
  disabled?: boolean
}

export function AlbumSharedAiLabelingFields({
  tracks,
  onApply,
  disabled,
}: AlbumSharedAiLabelingFieldsProps) {
  const shared = unanimous(tracks, (t) => JSON.stringify(t.aiLabeling ?? null))
  const value =
    shared === undefined
      ? null
      : tracks[0]?.aiLabeling ?? null

  return (
    <section className="space-y-4 rounded-xl border border-border bg-muted/20 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold">Общая AI-маркировка альбома</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Выбор ниже применяется ко всем трекам.
          {shared === undefined
            ? " Сейчас у треков разные значения - выберите общий вариант."
            : ""}
        </p>
      </div>
      <div data-wizard-field={wizardFieldId("album-shared-aiLabeling")}>
        <TrackAiLabelingFields
          trackId="album-shared"
          value={value}
          disabled={disabled}
          onChange={onApply}
        />
      </div>
    </section>
  )
}
