"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  GENRES,
  LYRICS_TEXT_UPLOAD_HINT,
  TRACK_MOODS,
  musicRightsRequiresAiService,
} from "@/lib/track-constants"
import type { Track } from "@/lib/tracks"

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

export type TrackDraftPatch = Partial<
  Pick<
    Track,
    | "trackName"
    | "genre"
    | "mood"
    | "shortDescription"
    | "lyricsText"
    | "lyricsAuthor"
    | "musicAuthor"
    | "musicRights"
    | "musicAiService"
    | "lyricsRights"
    | "performanceRights"
    | "isInstrumental"
    | "backingAuthor"
    | "isrc"
    | "transferFromOtherDistributor"
  >
>

type TrackMetadataFieldsProps = {
  track: Track
  onChange: (patch: TrackDraftPatch) => void
  disabled?: boolean
  showTransferFields?: boolean
}

export function TrackMetadataFields({
  track,
  onChange,
  disabled,
  showTransferFields,
}: TrackMetadataFieldsProps) {
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false)
  const [lyricsDraft, setLyricsDraft] = useState("")

  const openLyricsDialog = () => {
    setLyricsDraft(track.lyricsText)
    setLyricsDialogOpen(true)
  }

  const saveLyrics = () => {
    onChange({ lyricsText: lyricsDraft })
    setLyricsDialogOpen(false)
  }

  const lyricsPreview =
    track.lyricsText.trim().length > 0
      ? track.lyricsText.trim().slice(0, 120) + (track.lyricsText.trim().length > 120 ? "…" : "")
      : null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label>Название трека *</Label>
        <Input
          value={track.trackName}
          onChange={(e) => onChange({ trackName: e.target.value })}
          disabled={disabled}
          maxLength={100}
        />
      </div>
      <div>
        <Label>Жанр *</Label>
        <Select
          value={track.genre || undefined}
          onValueChange={(v) => onChange({ genre: v as Track["genre"] })}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue placeholder="Выберите жанр" /></SelectTrigger>
          <SelectContent>
            {GENRES.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Настроение *</Label>
        <Select
          value={track.mood || undefined}
          onValueChange={(v) => onChange({ mood: v as Track["mood"] })}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue placeholder="Выберите настроение" /></SelectTrigger>
          <SelectContent>
            {TRACK_MOODS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>Краткое описание *</Label>
        <Textarea
          value={track.shortDescription}
          onChange={(e) => onChange({ shortDescription: e.target.value })}
          disabled={disabled}
          maxLength={500}
          rows={2}
        />
      </div>
      <div>
        <Label>Автор музыки *</Label>
        <Input
          value={track.musicAuthor}
          onChange={(e) => onChange({ musicAuthor: e.target.value })}
          disabled={disabled}
          maxLength={100}
        />
      </div>
      <div>
        <Label>Права на музыку *</Label>
        <Select
          value={track.musicRights || undefined}
          onValueChange={(v) => onChange({ musicRights: v })}
          disabled={disabled}
        >
          <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
          <SelectContent>
            {MUSIC_RIGHTS_OPTIONS.map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {musicRightsRequiresAiService(track.musicRights) ? (
        <div className="sm:col-span-2">
          <Label>ИИ-сервис (название или ссылка) *</Label>
          <Input
            value={track.musicAiService}
            onChange={(e) => onChange({ musicAiService: e.target.value })}
            disabled={disabled}
            maxLength={500}
          />
        </div>
      ) : null}
      <div className="sm:col-span-2 flex items-center gap-2">
        <Checkbox
          id={`instrumental-${track.id}`}
          checked={track.isInstrumental}
          onCheckedChange={(c) => onChange({ isInstrumental: c === true })}
          disabled={disabled}
        />
        <Label htmlFor={`instrumental-${track.id}`} className="font-normal cursor-pointer">
          Инструментальный трек (без текста)
        </Label>
      </div>
      {!track.isInstrumental ? (
        <>
          <div className="sm:col-span-2">
            <Label>Текст песни</Label>
            <p className="text-xs text-muted-foreground mb-1">{LYRICS_TEXT_UPLOAD_HINT}</p>
            <div className="rounded-md border border-border p-3 space-y-2">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words min-h-[2.5rem]">
                {lyricsPreview ?? "Текст не добавлен"}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={openLyricsDialog} disabled={disabled}>
                {track.lyricsText.trim() ? "Редактировать текст" : "Добавить текст"}
              </Button>
            </div>
            <Dialog open={lyricsDialogOpen} onOpenChange={setLyricsDialogOpen}>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Текст песни</DialogTitle>
                </DialogHeader>
                <Textarea
                  value={lyricsDraft}
                  onChange={(e) => setLyricsDraft(e.target.value)}
                  disabled={disabled}
                  maxLength={5000}
                  rows={12}
                  className="resize-none"
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setLyricsDialogOpen(false)}>
                    Отмена
                  </Button>
                  <Button type="button" onClick={saveLyrics} disabled={disabled}>
                    Сохранить
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div>
            <Label>Автор текста</Label>
            <Input
              value={track.lyricsAuthor}
              onChange={(e) => onChange({ lyricsAuthor: e.target.value })}
              disabled={disabled}
              maxLength={100}
            />
          </div>
          <div>
            <Label>Права на текст *</Label>
            <Select
              value={track.lyricsRights || undefined}
              onValueChange={(v) => onChange({ lyricsRights: v })}
              disabled={disabled}
            >
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                {LYRICS_RIGHTS_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Права на исполнение *</Label>
            <Select
              value={track.performanceRights || undefined}
              onValueChange={(v) => onChange({ performanceRights: v })}
              disabled={disabled}
            >
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                {PERFORMANCE_RIGHTS_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}
      {showTransferFields ? (
        <>
          <div className="sm:col-span-2 flex items-center gap-2">
            <Checkbox
              id={`transfer-${track.id}`}
              checked={track.transferFromOtherDistributor}
              onCheckedChange={(c) => onChange({ transferFromOtherDistributor: c === true })}
              disabled={disabled}
            />
            <Label htmlFor={`transfer-${track.id}`} className="font-normal cursor-pointer">
              Перенос с другого дистрибьютора (нужен ISRC)
            </Label>
          </div>
          {track.transferFromOtherDistributor ? (
            <div>
              <Label>ISRC *</Label>
              <Input
                value={track.isrc ?? ""}
                onChange={(e) => onChange({ isrc: e.target.value })}
                disabled={disabled}
                maxLength={32}
              />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
