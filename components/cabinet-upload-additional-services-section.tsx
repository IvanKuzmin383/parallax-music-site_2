"use client"

import { useMemo, useRef, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  AI_COVER_REQUEST_PRICE_RUB,
} from "@/lib/track-constants"
import { getVerticalVideoUnitPrice } from "@/lib/vertical-video-pricing"
import { AI_MASTERING_PRICE_RUB } from "@/lib/ai-mastering-pricing"
import { YANDEX_VIDEOSHOT_PRICE_RUB } from "@/lib/yandex-videoshot-pricing"
import { YANDEX_VIDEOSHOT_CREATION_PRICE_RUB } from "@/lib/yandex-videoshot-creation-pricing"
import { YANDEX_VIDEOAVATAR_PRICE_RUB } from "@/lib/yandex-videoavatar-pricing"
import { SPOTIFY_VIDEOSHOT_PRICE_RUB } from "@/lib/spotify-videoshot-pricing"
import { ChevronLeft, ChevronRight } from "lucide-react"

export type CabinetUploadAddonInfoKey =
  | "aiCover"
  | "verticalVideo"
  | "aiMastering"
  | "yandexVideoshot"
  | "yandexVideoshotCreation"
  | "yandexVideoavatar"
  | "spotifyVideoshot"

type AddonInfoEntry = {
  title: string
  description: string
  examples: string[]
  examplesUsageTitle?: string
  examplesUsageItems?: string[]
  examplesRecommendationsTitle?: string
  examplesRecommendationsItems?: string[]
  spotifyOfferTitle?: string
  spotifyOfferItems?: string[]
  spotifyMiddleText?: string
  spotifyUsageTitle?: string
  spotifyUsageItems?: string[]
  spotifyFooterText?: string
  yandexCreationPriceLine?: string
  yandexCreationOfferTitle?: string
  yandexCreationOfferItems?: string[]
  yandexCreationMiddleText?: string
  yandexCreationRequirementsText?: string
  yandexCreationImpactText?: string
  yandexCreationUsageTitle?: string
  yandexCreationUsageItems?: string[]
  yandexCreationFooterText?: string
  yandexAvatarIntroText?: string
  yandexAvatarFormatTitle?: string
  yandexAvatarFormatItems?: string[]
  yandexAvatarPlacementText?: string
  yandexAvatarDurationText?: string
  yandexAvatarForbiddenTitle?: string
  yandexAvatarForbiddenItems?: string[]
  yandexAvatarFinalText?: string
  yandexAvatarPriceLine?: string
  exampleImages?: { src: string; alt: string }[]
  exampleVideos?: { src: string; title: string }[]
  exampleAudios?: { src: string; title: string; label: string }[]
}

export const CABINET_UPLOAD_ADDON_INFO: Record<CabinetUploadAddonInfoKey, AddonInfoEntry> = {
  aiCover: {
    title: "AI обложка для трека",
    description: "Наша команда подготовит визуал для вашего релиза",
    examples: [],
    exampleImages: [
      { src: "/aicover/example1.png", alt: "Пример AI обложки 1" },
      { src: "/aicover/example2.png", alt: "Пример AI обложки 2" },
      { src: "/aicover/example3.png", alt: "Пример AI обложки 3" },
    ],
  },
  verticalVideo: {
    title: "Видео для трека",
    description:
      "Создаем вертикальные видео под релиз для публикаций в Reels, Shorts и TikTok. Стилистика и визуальные акценты подбираются под жанр и настроение трека.",
    examples: [],
    exampleVideos: [
      { src: "/videos/vertical-examples/example-1.mp4", title: "Пример видео 1" },
      { src: "/videos/vertical-examples/example-2.mp4", title: "Пример видео 2" },
      { src: "/videos/vertical-examples/example-3.mp4", title: "Пример видео 3" },
    ],
  },
  aiMastering: {
    title: "AI мастеринг трека",
    description:
      "Автоматическая обработка музыки нейросетью, которая анализирует спектр и динамику трека, после чего применяет оптимальные настройки эквалайзера, компрессора и лимитера. Нейросеть обучена на тысячах треков с mastering'ом от топовых звукоинженеров. В результате вы получаете готовый трек с уровнем громкости и качеством соответствующим стандартам стриминговых сервисов.",
    examples: ["Сравните звучание до и после мастеринга."],
    exampleAudios: [
      { src: "/aimastering/before.wav", title: "AI мастеринг: До", label: "До" },
      { src: "/aimastering/after.wav", title: "AI мастеринг: После", label: "После" },
    ],
  },
  yandexVideoshot: {
    title: "Загрузить видеошот на Яндекс Музыка",
    description:
      "Видеошот для Яндекс Музыки - это зацикленное вертикальное видео (5–15 секунд, MP4, H.264, 404x720 пикселей), повышающее вовлеченность слушателей. Требуется высокое качество, центрирование объектов и отсутствие движения губ в кадре (липсинга), так как звук не совпадает при цикле. Видеошоты увеличивают лайки и шеринги треков на 25–26%.",
    examples: [],
    examplesUsageTitle: "В качестве видеошота можно использовать:",
    examplesUsageItems: [
      "видео, снятое специально для сервиса Яндекс Музыка;",
      "кадры из клипа; бэкстейдж;",
      "моушн-дизайн.",
    ],
    examplesRecommendationsTitle: "Рекомендации:",
    examplesRecommendationsItems: [
      "не используйте кадры с пением;",
      "избегайте очень коротких резких кадров;",
      "держите ключевые объекты в центре;",
      "собирайте короткий законченный сюжет.",
    ],
    exampleVideos: [
      { src: "/videoshot/example1.MOV", title: "Видеошот пример 1" },
      { src: "/videoshot/example2.MOV", title: "Видеошот пример 2" },
      { src: "/videoshot/example3.MOV", title: "Видеошот пример 3" },
    ],
  },
  yandexVideoshotCreation: {
    title: "Создание видеошота для Яндекс Музыка",
    description: "Наша команда создаст для вас уникальный видеоряд для вашего трека.",
    examples: [],
    yandexCreationPriceLine: "Стоимость: 3000 руб. / шт. + Загрузка на Яндекс Музыка (бесплатно)",
    yandexCreationOfferTitle: "Что мы предлагаем:",
    yandexCreationOfferItems: [
      "нарезку из готового клипа или бэкстейджа;",
      "моушн-дизайн и абстрактную графику.",
    ],
    yandexCreationMiddleText:
      "Видеошот для Яндекс Музыки - это зацикленное вертикальное видео (5–15 секунд, MP4, H.264, 404x720 пикселей), повышающее вовлеченность слушателей.",
    yandexCreationRequirementsText:
      "Требуется высокое качество, центрирование объектов и отсутствие движения губ в кадре (липсинга), так как звук не совпадает при цикле.",
    yandexCreationImpactText: "Видеошоты увеличивают лайки и шеринги треков на 25–26%.",
    yandexCreationUsageTitle: "В качестве видеошота можно использовать:",
    yandexCreationUsageItems: [
      "видео, снятое специально для сервиса Яндекс Музыка;",
      "кадры из клипа;",
      "бэкстейдж;",
      "моушн-дизайн.",
    ],
    yandexCreationFooterText:
      "Видеошоты могут быть добавлены как к уже выпущенным трекам, так и к предстоящим релизам.",
    exampleVideos: [
      { src: "/videoshot/example1.MOV", title: "Видеошот пример 1" },
      { src: "/videoshot/example2.MOV", title: "Видеошот пример 2" },
      { src: "/videoshot/example3.MOV", title: "Видеошот пример 3" },
    ],
  },
  yandexVideoavatar: {
    title: "Создание видеоаватара для Яндекс Музыка",
    description: "Видеоаватар - это небольшой фоновый отрывок видео вместо фотографии в карточке артиста.",
    examples: [],
    yandexAvatarIntroText: "Вы можете загрузить его через поддержку BandLink (Яндекс Музыка).",
    yandexAvatarFormatTitle: "Требования к формату:",
    yandexAvatarFormatItems: [
      "у вас должны быть права на видео;",
      "разрешение 1000x1345 px;",
      "размер не более 5 МБ;",
      "в кадре обязательно должен быть артист или участники группы, без посторонних людей.",
    ],
    yandexAvatarPlacementText:
      "Не рекомендуется располагать лицо в нижней трети видео, так как там будут имя исполнителя и кнопки управления треком.",
    yandexAvatarDurationText: "Ограничений по длительности видеообложки нет, но рекомендуется 5–7 секунд.",
    yandexAvatarForbiddenTitle: "Нельзя размещать:",
    yandexAvatarForbiddenItems: [
      "оскорбительные и запрещенные материалы;",
      "кадры с сигаретами, алкоголем, наркотиками;",
      "эротические, агрессивные или жестокие сцены;",
      "рекламу брендов, альбома или концерта;",
      "картинку с текстом, вотермарки или бейджи других сервисов.",
    ],
    yandexAvatarFinalText:
      "Первый кадр видео в формате изображения будет показываться, пока видеообложка не запустилась.",
    yandexAvatarPriceLine: "Стоимость: 3000 руб. / шт.",
  },
  spotifyVideoshot: {
    title: "Видеошот для Spotify",
    description: "Наша команда создаст для вас уникальный видеоряд для вашего трека.",
    examples: [],
    spotifyOfferTitle: "Что мы предлагаем:",
    spotifyOfferItems: [
      "нарезку из готового клипа или бэкстейджа;",
      "моушн-дизайн и абстрактную графику.",
    ],
    spotifyMiddleText:
      "Видеошот для Spotify - это зацикленное вертикальное видео (от 3 до 8 секунд, MP4, H.264, 404x720 пикселей), повышающее вовлеченность слушателей. Требуется высокое качество, центрирование объектов и отсутствие движения губ в кадре (липсинга), так как звук не совпадает при цикле.",
    spotifyUsageTitle:
      "Видеошоты увеличивают лайки и шеринги треков на 25–26%. В качестве видеошота можно использовать:",
    spotifyUsageItems: ["кадры из клипа;", "бэкстейдж;", "моушн-дизайн."],
    spotifyFooterText:
      "Видеошоты могут быть добавлены как к уже выпущенным трекам, так и к предстоящим релизам.",
    exampleVideos: [
      { src: "/videoshot/example1.MOV", title: "Spotify видеошот пример 1" },
      { src: "/videoshot/example2.MOV", title: "Spotify видеошот пример 2" },
      { src: "/videoshot/example3.MOV", title: "Spotify видеошот пример 3" },
    ],
  },
}

export type CabinetUploadAddonSelectionState = {
  requestAiCover: boolean
  addonVerticalVideo: boolean
  addonVerticalVideoCount: number
  addonAiMastering: boolean
  addonAiMasteringCount: number
  addonYandexVideoshot: boolean
  addonYandexVideoshotCreation: boolean
  addonYandexVideoavatar: boolean
  addonSpotifyVideoshot: boolean
}

/** Сумма доп. услуг для UI и проверки «нужна ли оплата» (совпадает с расчётом на странице одного трека). */
export function computeSelectedUploadAddonsTotalRub(s: CabinetUploadAddonSelectionState): number {
  const aiCoverAddonTotal = s.requestAiCover ? AI_COVER_REQUEST_PRICE_RUB : 0
  const verticalVideoUnitPrice = getVerticalVideoUnitPrice(s.addonVerticalVideoCount)
  const verticalVideoAddonTotal = s.addonVerticalVideo ? verticalVideoUnitPrice * s.addonVerticalVideoCount : 0
  const aiMasteringAddonTotal = s.addonAiMastering ? AI_MASTERING_PRICE_RUB * s.addonAiMasteringCount : 0
  const yandexVideoshotAddonTotal = s.addonYandexVideoshot ? YANDEX_VIDEOSHOT_PRICE_RUB : 0
  const yandexVideoshotCreationAddonTotal = s.addonYandexVideoshotCreation ? YANDEX_VIDEOSHOT_CREATION_PRICE_RUB : 0
  const yandexVideoavatarAddonTotal = s.addonYandexVideoavatar ? YANDEX_VIDEOAVATAR_PRICE_RUB : 0
  const spotifyVideoshotAddonTotal = s.addonSpotifyVideoshot ? SPOTIFY_VIDEOSHOT_PRICE_RUB : 0
  return (
    aiCoverAddonTotal +
    verticalVideoAddonTotal +
    aiMasteringAddonTotal +
    yandexVideoshotAddonTotal +
    yandexVideoshotCreationAddonTotal +
    yandexVideoavatarAddonTotal +
    spotifyVideoshotAddonTotal
  )
}

export type CabinetUploadAdditionalServicesSectionProps = {
  formDisabled: boolean
  /** Строка AI обложки; получает `openAddonInfo` для кнопки «Подробнее» */
  renderAiCoverRow: (openAddonInfo: (key: CabinetUploadAddonInfoKey) => void) => ReactNode
  requestAiCover: boolean
  addonVerticalVideo: boolean
  setAddonVerticalVideo: (v: boolean) => void
  addonVerticalVideoCount: number
  setAddonVerticalVideoCount: (n: number) => void
  addonAiMastering: boolean
  setAddonAiMastering: (v: boolean) => void
  addonAiMasteringCount: number
  setAddonAiMasteringCount: (n: number) => void
  addonYandexVideoshot: boolean
  setAddonYandexVideoshot: (v: boolean) => void
  addonYandexVideoshotCreation: boolean
  setAddonYandexVideoshotCreation: (v: boolean) => void
  addonYandexVideoavatar: boolean
  setAddonYandexVideoavatar: (v: boolean) => void
  addonSpotifyVideoshot: boolean
  setAddonSpotifyVideoshot: (v: boolean) => void
  /** Подсказка под итогом: «трек» или «альбом» */
  afterPaymentSubject: "трек" | "альбом"
  sectionClassName?: string
}

export function CabinetUploadAdditionalServicesSection({
  formDisabled,
  renderAiCoverRow,
  requestAiCover,
  addonVerticalVideo,
  setAddonVerticalVideo,
  addonVerticalVideoCount,
  setAddonVerticalVideoCount,
  addonAiMastering,
  setAddonAiMastering,
  addonAiMasteringCount,
  setAddonAiMasteringCount,
  addonYandexVideoshot,
  setAddonYandexVideoshot,
  addonYandexVideoshotCreation,
  setAddonYandexVideoshotCreation,
  addonYandexVideoavatar,
  setAddonYandexVideoavatar,
  addonSpotifyVideoshot,
  setAddonSpotifyVideoshot,
  afterPaymentSubject,
  sectionClassName,
}: CabinetUploadAdditionalServicesSectionProps) {
  const [isAdditionalOpen, setIsAdditionalOpen] = useState(false)
  const [addonInfoOpen, setAddonInfoOpen] = useState(false)
  const [addonInfoKey, setAddonInfoKey] = useState<CabinetUploadAddonInfoKey>("aiCover")
  const [addonInfoImageIndex, setAddonInfoImageIndex] = useState(0)
  const masteringAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({})

  const verticalVideoUnitPrice = useMemo(
    () => getVerticalVideoUnitPrice(addonVerticalVideoCount),
    [addonVerticalVideoCount]
  )
  const verticalVideoAddonTotal = addonVerticalVideo ? verticalVideoUnitPrice * addonVerticalVideoCount : 0
  const aiMasteringAddonTotal = addonAiMastering ? AI_MASTERING_PRICE_RUB * addonAiMasteringCount : 0

  const selectedAddonsTotal = computeSelectedUploadAddonsTotalRub({
    requestAiCover,
    addonVerticalVideo,
    addonVerticalVideoCount,
    addonAiMastering,
    addonAiMasteringCount,
    addonYandexVideoshot,
    addonYandexVideoshotCreation,
    addonYandexVideoavatar,
    addonSpotifyVideoshot,
  })

  const openAddonInfo = (key: CabinetUploadAddonInfoKey) => {
    setAddonInfoKey(key)
    setAddonInfoImageIndex(0)
    setAddonInfoOpen(true)
  }

  const handleMasteringAudioPlay = (currentSrc: string) => {
    Object.entries(masteringAudioRefs.current).forEach(([src, audio]) => {
      if (src !== currentSrc && audio && !audio.paused) {
        audio.pause()
        audio.currentTime = 0
      }
    })
  }

  const info = CABINET_UPLOAD_ADDON_INFO[addonInfoKey]

  return (
    <>
      <section
        className={cn(
          "rounded-xl border-2 border-primary/30 bg-primary/5 p-5 space-y-4",
          sectionClassName
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">Дополнительно</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsAdditionalOpen((prev) => !prev)}>
            {isAdditionalOpen ? "Свернуть" : "Развернуть"}
          </Button>
        </div>
        {isAdditionalOpen ? (
          <>
            {renderAiCoverRow(openAddonInfo)}
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={addonVerticalVideo}
                  onCheckedChange={(v) => setAddonVerticalVideo(v === true)}
                  disabled={formDisabled}
                />
                <span>Видео для трека</span>
              </label>
              <div className="flex shrink-0 items-center justify-end gap-3 sm:ml-auto">
                <span className="min-w-[7.5rem] text-right text-sm font-medium tabular-nums text-foreground">
                  от 99 руб. / шт.
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => openAddonInfo("verticalVideo")}>
                  Подробнее
                </Button>
              </div>
            </div>
            {addonVerticalVideo ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Input
                  type="number"
                  min={1}
                  value={addonVerticalVideoCount}
                  onChange={(e) => setAddonVerticalVideoCount(Math.max(1, Number(e.target.value || 1)))}
                  className="max-w-48"
                  disabled={formDisabled}
                />
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Стоимость: {verticalVideoUnitPrice} руб. / шт. × {addonVerticalVideoCount} ={" "}
                  {verticalVideoAddonTotal} руб.
                </p>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={addonAiMastering}
                  onCheckedChange={(v) => setAddonAiMastering(v === true)}
                  disabled={formDisabled}
                />
                <span>AI мастеринг трека</span>
              </label>
              <div className="flex shrink-0 items-center justify-end gap-3 sm:ml-auto">
                <span className="min-w-[7.5rem] text-right text-sm font-medium tabular-nums text-foreground">
                  100 руб. / шт.
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => openAddonInfo("aiMastering")}>
                  Подробнее
                </Button>
              </div>
            </div>
            {addonAiMastering ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Input
                  type="number"
                  min={1}
                  value={addonAiMasteringCount}
                  onChange={(e) => setAddonAiMasteringCount(Math.max(1, Number(e.target.value || 1)))}
                  className="max-w-48"
                  disabled={formDisabled}
                />
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Стоимость: {AI_MASTERING_PRICE_RUB} руб. / трек × {addonAiMasteringCount} = {aiMasteringAddonTotal}{" "}
                  руб.
                </p>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={addonYandexVideoshot}
                  onCheckedChange={(v) => setAddonYandexVideoshot(v === true)}
                  disabled={formDisabled}
                />
                <span>Загрузить видеошот на Яндекс Музыка</span>
              </label>
              <div className="flex shrink-0 items-center justify-end gap-3 sm:ml-auto">
                <span className="min-w-[7.5rem] text-right text-sm font-medium tabular-nums text-foreground">
                  900 руб. / шт.
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => openAddonInfo("yandexVideoshot")}>
                  Подробнее
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={addonYandexVideoshotCreation}
                  onCheckedChange={(v) => setAddonYandexVideoshotCreation(v === true)}
                  disabled={formDisabled}
                />
                <span>
                  Создание видеошота для Яндекс Музыка + Загрузка на Яндекс Музыка (
                  <span className="text-red-500">бесплатно</span>)
                </span>
              </label>
              <div className="flex shrink-0 items-center justify-end gap-3 sm:ml-auto">
                <span className="min-w-[7.5rem] text-right text-sm font-medium tabular-nums text-foreground">
                  3000 руб. / шт.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openAddonInfo("yandexVideoshotCreation")}
                >
                  Подробнее
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={addonYandexVideoavatar}
                  onCheckedChange={(v) => setAddonYandexVideoavatar(v === true)}
                  disabled={formDisabled}
                />
                <span>Создание видеоаватара для Яндекс Музыка</span>
              </label>
              <div className="flex shrink-0 items-center justify-end gap-3 sm:ml-auto">
                <span className="min-w-[7.5rem] text-right text-sm font-medium tabular-nums text-foreground">
                  3000 руб. / шт.
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => openAddonInfo("yandexVideoavatar")}>
                  Подробнее
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex min-w-0 flex-1 items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5 shrink-0"
                  checked={addonSpotifyVideoshot}
                  onCheckedChange={(v) => setAddonSpotifyVideoshot(v === true)}
                  disabled={formDisabled}
                />
                <span>Видеошот для Spotify</span>
              </label>
              <div className="flex shrink-0 items-center justify-end gap-3 sm:ml-auto">
                <span className="min-w-[7.5rem] text-right text-sm font-medium tabular-nums text-foreground">
                  3000 руб. / шт.
                </span>
                <Button type="button" variant="outline" size="sm" onClick={() => openAddonInfo("spotifyVideoshot")}>
                  Подробнее
                </Button>
              </div>
            </div>
            <div className="flex flex-col gap-2 rounded-md bg-green-500/5 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-base font-semibold text-foreground md:text-lg">Итоговая стоимость выбранных доп услуг:</p>
              <span className="text-base font-semibold tabular-nums text-green-500 sm:text-right md:text-lg">
                {selectedAddonsTotal} руб.
              </span>
            </div>
            {requestAiCover ||
            addonVerticalVideo ||
            addonAiMastering ||
            addonYandexVideoshot ||
            addonYandexVideoshotCreation ||
            addonYandexVideoavatar ||
            addonSpotifyVideoshot ? (
              <p className="text-xs text-muted-foreground">
                После отправки формы откроется оплата выбранных услуг. После оплаты {afterPaymentSubject} будет отправлен
                на модерацию.
              </p>
            ) : null}
          </>
        ) : null}
      </section>

      <Dialog open={addonInfoOpen} onOpenChange={setAddonInfoOpen}>
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[98vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{info.title}</DialogTitle>
            <DialogDescription>{info.description}</DialogDescription>
          </DialogHeader>
          {addonInfoKey === "spotifyVideoshot" ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-semibold text-destructive">Внимание</p>
              <p className="mt-1 text-muted-foreground">
                Для того чтобы загрузить видеошоты на Spotify, вам потребуется доступ к платформе Spotify for Artists. Это
                специальный инструмент для музыкантов, который позволяет управлять своим профилем, отслеживать статистику и
                взаимодействовать с фанатами. После регистрации и подтверждения своего профиля вы сможете добавить
                видеошоты к своим трекам через функцию Canvas.
              </p>
            </div>
          ) : null}
          <div className="space-y-2 text-sm">
            {addonInfoKey !== "yandexVideoavatar" ? (
              <p className="font-medium">{addonInfoKey === "aiMastering" ? "Пример AI мастеринга" : "Примеры работ:"}</p>
            ) : null}
            {info.exampleImages?.length ? (
              <div className="space-y-3">
                <div
                  className={cn(
                    "relative overflow-hidden rounded-md border border-border bg-muted",
                    addonInfoKey === "aiCover" ? "mx-auto aspect-square w-full max-w-xl" : ""
                  )}
                >
                  <img
                    src={info.exampleImages[addonInfoImageIndex].src}
                    alt={info.exampleImages[addonInfoImageIndex].alt}
                    className={cn("w-full object-cover", addonInfoKey === "aiCover" ? "h-full" : "h-[32rem]")}
                    loading="lazy"
                  />
                  {addonInfoKey === "aiCover" && (info.exampleImages?.length ?? 0) > 1 ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/85 hover:bg-background"
                        onClick={() =>
                          setAddonInfoImageIndex((prev) =>
                            prev === 0 ? (info.exampleImages?.length ?? 1) - 1 : prev - 1
                          )
                        }
                        aria-label="Предыдущее изображение"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/85 hover:bg-background"
                        onClick={() =>
                          setAddonInfoImageIndex((prev) => (prev + 1) % (info.exampleImages?.length ?? 1))
                        }
                        aria-label="Следующее изображение"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  ) : null}
                </div>
                {addonInfoKey === "aiCover" ? (
                  <p className="text-center text-xs text-muted-foreground">
                    {addonInfoImageIndex + 1} / {info.exampleImages.length}
                  </p>
                ) : (
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setAddonInfoImageIndex((prev) =>
                          prev === 0 ? (info.exampleImages?.length ?? 1) - 1 : prev - 1
                        )
                      }
                    >
                      Назад
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {addonInfoImageIndex + 1} / {info.exampleImages.length}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setAddonInfoImageIndex((prev) => (prev + 1) % (info.exampleImages?.length ?? 1))
                      }
                    >
                      Далее
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
            {info.exampleVideos?.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {info.exampleVideos.map((video) => (
                  <div key={video.src} className="aspect-[9/16] overflow-hidden rounded-md border border-border bg-muted">
                    <video
                      src={video.src}
                      controls
                      playsInline
                      className="h-full w-full object-cover"
                      preload="metadata"
                      title={video.title}
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {info.exampleAudios?.length ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {info.exampleAudios.map((audio) => (
                  <div key={audio.src} className="rounded-md border border-border bg-muted p-3 space-y-2">
                    <p className="text-sm font-medium">{audio.label}</p>
                    <audio
                      controls
                      preload="metadata"
                      className="w-full"
                      title={audio.title}
                      ref={(node) => {
                        masteringAudioRefs.current[audio.src] = node
                      }}
                      onPlay={() => handleMasteringAudioPlay(audio.src)}
                    >
                      <source src={audio.src} />
                      Ваш браузер не поддерживает воспроизведение аудио.
                    </audio>
                  </div>
                ))}
              </div>
            ) : null}
            {addonInfoKey === "yandexVideoshot" &&
            info.examplesUsageItems?.length &&
            info.examplesRecommendationsItems?.length ? (
              <div className="space-y-2 text-muted-foreground">
                <p>{info.examplesUsageTitle}</p>
                <ul className="list-disc list-inside space-y-1">
                  {info.examplesUsageItems?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>{info.examplesRecommendationsTitle}</p>
                <ul className="list-disc list-inside space-y-1">
                  {info.examplesRecommendationsItems?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {addonInfoKey === "spotifyVideoshot" && info.spotifyOfferItems?.length && info.spotifyUsageItems?.length ? (
              <div className="space-y-2 text-muted-foreground">
                <p>{info.spotifyOfferTitle}</p>
                <ul className="list-disc list-inside space-y-1">
                  {info.spotifyOfferItems?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>{info.spotifyMiddleText}</p>
                <p>{info.spotifyUsageTitle}</p>
                <ul className="list-disc list-inside space-y-1">
                  {info.spotifyUsageItems?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>{info.spotifyFooterText}</p>
              </div>
            ) : null}
            {addonInfoKey === "yandexVideoshotCreation" &&
            info.yandexCreationOfferItems?.length &&
            info.yandexCreationUsageItems?.length ? (
              <div className="space-y-2 text-muted-foreground">
                <p>{info.yandexCreationOfferTitle}</p>
                <ul className="list-disc list-inside space-y-1">
                  {info.yandexCreationOfferItems?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>{info.yandexCreationMiddleText}</p>
                <p>{info.yandexCreationRequirementsText}</p>
                <p>{info.yandexCreationImpactText}</p>
                <p>{info.yandexCreationUsageTitle}</p>
                <ul className="list-disc list-inside space-y-1">
                  {info.yandexCreationUsageItems?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>{info.yandexCreationFooterText}</p>
              </div>
            ) : null}
            {addonInfoKey === "yandexVideoavatar" &&
            info.yandexAvatarFormatItems?.length &&
            info.yandexAvatarForbiddenItems?.length ? (
              <div className="space-y-2 text-muted-foreground">
                <p>{info.yandexAvatarIntroText}</p>
                <p>{info.yandexAvatarFormatTitle}</p>
                <ul className="list-disc list-inside space-y-1">
                  {info.yandexAvatarFormatItems?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>{info.yandexAvatarPlacementText}</p>
                <p>{info.yandexAvatarDurationText}</p>
                <p>{info.yandexAvatarForbiddenTitle}</p>
                <ul className="list-disc list-inside space-y-1">
                  {info.yandexAvatarForbiddenItems?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>{info.yandexAvatarFinalText}</p>
              </div>
            ) : null}
            {addonInfoKey !== "yandexVideoshot" &&
            addonInfoKey !== "spotifyVideoshot" &&
            addonInfoKey !== "yandexVideoshotCreation" &&
            addonInfoKey !== "yandexVideoavatar" &&
            info.examples.length ? (
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {info.examples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            ) : null}
            {addonInfoKey === "aiCover" ? (
              <div className="rounded-md bg-green-500/5 p-3">
                <p className="text-lg font-semibold">
                  <span className="text-white">Стоимость: </span>
                  <span className="text-red-500">{AI_COVER_REQUEST_PRICE_RUB} руб. / шт.</span>
                </p>
              </div>
            ) : null}
            {addonInfoKey === "aiMastering" ? (
              <div className="rounded-md bg-green-500/5 p-3">
                <p className="text-lg font-semibold">
                  <span className="text-white">Стоимость: </span>
                  <span className="text-red-500">100 руб. / трек</span>
                </p>
              </div>
            ) : null}
            {addonInfoKey === "verticalVideo" ? (
              <div className="rounded-md bg-green-500/5 p-3 space-y-2 text-lg">
                <p className="font-semibold text-white">Стоимость:</p>
                <p className="font-medium">
                  <span className="text-white">до 10 видео - </span>
                  <span className="text-red-500">199 руб. / шт.</span>
                </p>
                <p className="font-medium">
                  <span className="text-white">до 50 видео - </span>
                  <span className="text-red-500">149 руб. / шт.</span>
                </p>
                <p className="font-medium">
                  <span className="text-white">свыше 50 видео - </span>
                  <span className="text-red-500">99 руб. / шт.</span>
                </p>
              </div>
            ) : null}
            {addonInfoKey === "yandexVideoshot" ? (
              <div className="rounded-md bg-green-500/5 p-3">
                <p className="text-lg font-semibold">
                  <span className="text-white">Стоимость: </span>
                  <span className="text-red-500">{YANDEX_VIDEOSHOT_PRICE_RUB} руб. / шт.</span>
                </p>
              </div>
            ) : null}
            {addonInfoKey === "yandexVideoshotCreation" ? (
              <div className="rounded-md bg-green-500/5 p-3">
                <p className="text-lg font-semibold">
                  <span className="text-white">Стоимость: </span>
                  <span className="text-red-500">3000 руб. / шт.</span>
                  <span className="text-white"> + Загрузка на Яндекс Музыка (</span>
                  <span className="text-red-500">бесплатно</span>
                  <span className="text-white">.)</span>
                </p>
              </div>
            ) : null}
            {addonInfoKey === "yandexVideoavatar" ? (
              <div className="rounded-md bg-green-500/5 p-3">
                <p className="text-lg font-semibold">
                  <span className="text-white">Стоимость: </span>
                  <span className="text-red-500">3000 руб. / шт.</span>
                </p>
              </div>
            ) : null}
            {addonInfoKey === "spotifyVideoshot" ? (
              <div className="rounded-md bg-green-500/5 p-3">
                <p className="text-lg font-semibold">
                  <span className="text-white">Стоимость: </span>
                  <span className="text-red-500">{SPOTIFY_VIDEOSHOT_PRICE_RUB} руб. / шт.</span>
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setAddonInfoOpen(false)} className="ml-auto">
              Понятно
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
