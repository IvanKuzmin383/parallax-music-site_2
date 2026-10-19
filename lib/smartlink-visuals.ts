import type { SmartlinkPreset } from "@/lib/smartlink-theme"

/** Фон страницы / карточки - раньше был зашит в пресет. */
export const SMARTLINK_BG_STYLES = [
  "ink",
  "blur",
  "sheet",
  "signal",
  "glass",
  "neon",
  "film",
  "carbon",
  "sunset",
  "cinema",
  "graffiti",
  "stage",
  "rave",
  "arcade",
  "vhs",
  "noir",
  "chrome",
  "polaroid",
  "diary",
  "zine",
  "stamp",
  "holo",
] as const
export type SmartlinkBgStyle = (typeof SMARTLINK_BG_STYLES)[number]

/**
 * Формат кнопок стримов - характер оформления.
 * `default` = обычные solid/outline/soft/glass/bare из theme.buttons.
 */
export const SMARTLINK_BUTTON_FORMATS = [
  "default",
  "neon",
  "film",
  "ticket",
  "terminal",
  "inkblot",
  "capsule",
  "cinema",
  "poster",
  "grid",
  "carbon",
  "sunset",
  "graffiti",
  "stage",
  "rave",
  "arcade",
  "vhs",
  "stamp",
  "chrome",
  "noir",
  "holo",
  "diary",
  "polaroid",
  "zine",
] as const
export type SmartlinkButtonFormat = (typeof SMARTLINK_BUTTON_FORMATS)[number]

/** Как показана обложка. */
export const SMARTLINK_COVER_FORMATS = [
  "default",
  "vinyl",
  "orbit",
  "cassette",
  "cinema",
  "poster",
  "ticket",
  "polaroid",
  "diary",
] as const
export type SmartlinkCoverFormat = (typeof SMARTLINK_COVER_FORMATS)[number]

/** Hover-эффект у кнопок списка. */
export const SMARTLINK_HOVER_EFFECTS = ["none", "paperTearV", "paperTearH"] as const
export type SmartlinkHoverEffect = (typeof SMARTLINK_HOVER_EFFECTS)[number]

/** Минимальный срез темы для резолва визуала (без цикличного импорта типа Theme). */
export type SmartlinkThemeVisualInput = {
  preset: SmartlinkPreset
  bgStyle?: SmartlinkBgStyle
  buttonFormat?: SmartlinkButtonFormat
  coverFormat?: SmartlinkCoverFormat
  hoverEffect?: SmartlinkHoverEffect
}

export type SmartlinkVisualPack = {
  bgStyle: SmartlinkBgStyle
  buttonFormat: SmartlinkButtonFormat
  coverFormat: SmartlinkCoverFormat
  hoverEffect: SmartlinkHoverEffect
}

export const SMARTLINK_BG_STYLE_META: Record<SmartlinkBgStyle, { label: string; description: string }> =
  {
    ink: { label: "Тёмный", description: "Спокойный тёмный фон" },
    blur: { label: "Размытие", description: "Обложка размыта на фоне" },
    sheet: { label: "Светлый", description: "Светлая карточка" },
    signal: { label: "Контраст", description: "Жёсткие блоки" },
    glass: { label: "Стекло", description: "Полупрозрачная карточка" },
    neon: { label: "Неон", description: "Размытие и свечение" },
    film: { label: "Плёнка", description: "Зерно и виньетка" },
    carbon: { label: "Карбон", description: "Диагональная сетка" },
    sunset: { label: "Закат", description: "Градиент акцента" },
    cinema: { label: "Кино", description: "Letterbox-полосы" },
    graffiti: { label: "Граффити", description: "Стена и стикеры" },
    stage: { label: "Сцена", description: "Тёмная сцена" },
    rave: { label: "Рейв", description: "Сетка и пульс" },
    arcade: { label: "Аркада", description: "Пиксельный автомат" },
    vhs: { label: "VHS", description: "Scanlines" },
    noir: { label: "Нуар", description: "Ч/б фон" },
    chrome: { label: "Хром", description: "Металлический блик" },
    polaroid: { label: "Полароид", description: "Стена снимков" },
    diary: { label: "Дневник", description: "Линованная бумага" },
    zine: { label: "Зин", description: "Коллаж / панк" },
    stamp: { label: "Штамп", description: "Почтовый фон" },
    holo: { label: "Голо", description: "Переливающийся фон" },
  }

export const SMARTLINK_BUTTON_FORMAT_META: Record<
  SmartlinkButtonFormat,
  { label: string; description: string }
> = {
  default: { label: "Обычные", description: "Плотные / контур / стекло из настроек ниже" },
  neon: { label: "Неон", description: "Обводка и свечение акцента" },
  film: { label: "Плёнка", description: "Матовые стикеры" },
  ticket: { label: "Билет", description: "Перфорация и штамп" },
  terminal: { label: "Терминал", description: "Mono-строки со стрелками" },
  inkblot: { label: "Чернила", description: "Кляксы в цветах площадок" },
  capsule: { label: "Капсула", description: "Вытянутые pills" },
  cinema: { label: "Кино", description: "Широкие uppercase" },
  poster: { label: "Постер", description: "Узкие uppercase" },
  grid: { label: "Сетка", description: "Значки в рамках" },
  carbon: { label: "Карбон", description: "Матовые блоки" },
  sunset: { label: "Закат", description: "Градиент на кнопке" },
  graffiti: { label: "Граффити", description: "Жирные стикеры" },
  stage: { label: "Сцена", description: "Металл / рок" },
  rave: { label: "Рейв", description: "Electronica uppercase" },
  arcade: { label: "Аркада", description: "Кнопки автомата" },
  vhs: { label: "VHS", description: "Ретро-подписи" },
  stamp: { label: "Штамп", description: "Пунктирная марка" },
  chrome: { label: "Хром", description: "Зеркальные pills" },
  noir: { label: "Нуар", description: "Жёсткий гротеск" },
  holo: { label: "Голо", description: "Перелив на кнопке" },
  diary: { label: "Дневник", description: "Бумага и зачёркивание" },
  polaroid: { label: "Полароид", description: "Мягкие снимки" },
  zine: { label: "Зин", description: "Рваные вырезки" },
}

export const SMARTLINK_COVER_FORMAT_META: Record<
  SmartlinkCoverFormat,
  { label: string; description: string }
> = {
  default: { label: "Обычная", description: "Квадрат по форме из настроек" },
  vinyl: { label: "Винил", description: "Круг, значки вокруг" },
  orbit: { label: "Орбита", description: "Круг и орбита значков" },
  cassette: { label: "Кассета", description: "Корпус с катушками" },
  cinema: { label: "Кино", description: "Широкий кадр" },
  poster: { label: "Постер", description: "Заголовок на обложке" },
  ticket: { label: "Билет", description: "Штамп LISTEN" },
  polaroid: { label: "Полароид", description: "Белая рамка" },
  diary: { label: "Дневник", description: "Скрепка сверху" },
}

export const SMARTLINK_HOVER_EFFECT_META: Record<
  SmartlinkHoverEffect,
  { label: string; description: string }
> = {
  none: { label: "Нет", description: "Обычный hover" },
  paperTearV: { label: "Разрыв ↕", description: "Лист / билет - вертикальный разрыв" },
  paperTearH: { label: "Разрыв ↔", description: "Зин - горизонтальный разрыв" },
}

/** Визуальный пакет каждого готового шаблона. */
export const SMARTLINK_PRESET_VISUALS: Record<SmartlinkPreset, SmartlinkVisualPack> = {
  ink: { bgStyle: "ink", buttonFormat: "default", coverFormat: "default", hoverEffect: "none" },
  blur: { bgStyle: "blur", buttonFormat: "default", coverFormat: "default", hoverEffect: "none" },
  sheet: {
    bgStyle: "sheet",
    buttonFormat: "default",
    coverFormat: "default",
    hoverEffect: "paperTearV",
  },
  signal: {
    bgStyle: "signal",
    buttonFormat: "default",
    coverFormat: "default",
    hoverEffect: "none",
  },
  glass: { bgStyle: "glass", buttonFormat: "default", coverFormat: "default", hoverEffect: "none" },
  neon: { bgStyle: "neon", buttonFormat: "neon", coverFormat: "default", hoverEffect: "none" },
  film: { bgStyle: "film", buttonFormat: "film", coverFormat: "default", hoverEffect: "none" },
  ticket: {
    bgStyle: "ink",
    buttonFormat: "ticket",
    coverFormat: "ticket",
    hoverEffect: "paperTearV",
  },
  vinyl: { bgStyle: "ink", buttonFormat: "default", coverFormat: "vinyl", hoverEffect: "none" },
  terminal: {
    bgStyle: "ink",
    buttonFormat: "terminal",
    coverFormat: "default",
    hoverEffect: "none",
  },
  poster: { bgStyle: "ink", buttonFormat: "poster", coverFormat: "poster", hoverEffect: "none" },
  inkblot: {
    bgStyle: "ink",
    buttonFormat: "inkblot",
    coverFormat: "default",
    hoverEffect: "none",
  },
  carbon: { bgStyle: "carbon", buttonFormat: "carbon", coverFormat: "default", hoverEffect: "none" },
  sunset: { bgStyle: "sunset", buttonFormat: "sunset", coverFormat: "default", hoverEffect: "none" },
  cinema: {
    bgStyle: "cinema",
    buttonFormat: "cinema",
    coverFormat: "cinema",
    hoverEffect: "none",
  },
  capsule: {
    bgStyle: "ink",
    buttonFormat: "capsule",
    coverFormat: "default",
    hoverEffect: "none",
  },
  grid: { bgStyle: "ink", buttonFormat: "grid", coverFormat: "default", hoverEffect: "none" },
  cassette: {
    bgStyle: "ink",
    buttonFormat: "default",
    coverFormat: "cassette",
    hoverEffect: "none",
  },
  graffiti: {
    bgStyle: "graffiti",
    buttonFormat: "graffiti",
    coverFormat: "default",
    hoverEffect: "none",
  },
  stage: { bgStyle: "stage", buttonFormat: "stage", coverFormat: "default", hoverEffect: "none" },
  rave: { bgStyle: "rave", buttonFormat: "rave", coverFormat: "default", hoverEffect: "none" },
  polaroid: {
    bgStyle: "polaroid",
    buttonFormat: "polaroid",
    coverFormat: "polaroid",
    hoverEffect: "none",
  },
  arcade: { bgStyle: "arcade", buttonFormat: "arcade", coverFormat: "default", hoverEffect: "none" },
  vhs: { bgStyle: "vhs", buttonFormat: "vhs", coverFormat: "default", hoverEffect: "none" },
  zine: { bgStyle: "zine", buttonFormat: "zine", coverFormat: "default", hoverEffect: "paperTearH" },
  chrome: { bgStyle: "chrome", buttonFormat: "chrome", coverFormat: "default", hoverEffect: "none" },
  noir: { bgStyle: "noir", buttonFormat: "noir", coverFormat: "default", hoverEffect: "none" },
  orbit: { bgStyle: "ink", buttonFormat: "default", coverFormat: "orbit", hoverEffect: "none" },
  stamp: { bgStyle: "stamp", buttonFormat: "stamp", coverFormat: "default", hoverEffect: "none" },
  holo: { bgStyle: "holo", buttonFormat: "holo", coverFormat: "default", hoverEffect: "none" },
  diary: { bgStyle: "diary", buttonFormat: "diary", coverFormat: "diary", hoverEffect: "none" },
}

export function isSmartlinkBgStyle(value: unknown): value is SmartlinkBgStyle {
  return typeof value === "string" && (SMARTLINK_BG_STYLES as readonly string[]).includes(value)
}

export function isSmartlinkButtonFormat(value: unknown): value is SmartlinkButtonFormat {
  return (
    typeof value === "string" && (SMARTLINK_BUTTON_FORMATS as readonly string[]).includes(value)
  )
}

export function isSmartlinkCoverFormat(value: unknown): value is SmartlinkCoverFormat {
  return typeof value === "string" && (SMARTLINK_COVER_FORMATS as readonly string[]).includes(value)
}

export function isSmartlinkHoverEffect(value: unknown): value is SmartlinkHoverEffect {
  return typeof value === "string" && (SMARTLINK_HOVER_EFFECTS as readonly string[]).includes(value)
}

/** Эффективный визуал: явные поля темы или пакет шаблона. */
export function resolveSmartlinkVisualPack(theme: SmartlinkThemeVisualInput): SmartlinkVisualPack {
  const fallback = SMARTLINK_PRESET_VISUALS[theme.preset] ?? SMARTLINK_PRESET_VISUALS.ink
  return {
    bgStyle: theme.bgStyle ?? fallback.bgStyle,
    buttonFormat: theme.buttonFormat ?? fallback.buttonFormat,
    coverFormat: theme.coverFormat ?? fallback.coverFormat,
    hoverEffect: theme.hoverEffect ?? fallback.hoverEffect,
  }
}

/** Флаги для лендинга - те же ветки, что раньше от preset ===. */
export function resolveSmartlinkVisualFlags(theme: SmartlinkThemeVisualInput) {
  const pack = resolveSmartlinkVisualPack(theme)
  const { bgStyle, buttonFormat, coverFormat, hoverEffect } = pack

  const isTicket = buttonFormat === "ticket" || coverFormat === "ticket"
  const isPolaroid = bgStyle === "polaroid" || buttonFormat === "polaroid" || coverFormat === "polaroid"
  const isArcade = bgStyle === "arcade" || buttonFormat === "arcade"
  const isVhs = bgStyle === "vhs" || buttonFormat === "vhs"
  const isZine = bgStyle === "zine" || buttonFormat === "zine"
  const isChrome = bgStyle === "chrome" || buttonFormat === "chrome"
  const isNoir = bgStyle === "noir" || buttonFormat === "noir"
  const isOrbit = coverFormat === "orbit"
  const isStamp = bgStyle === "stamp" || buttonFormat === "stamp"
  const isHolo = bgStyle === "holo" || buttonFormat === "holo"
  const isDiary = bgStyle === "diary" || buttonFormat === "diary" || coverFormat === "diary"
  const isGlassCard = bgStyle === "glass"
  const isSignal = bgStyle === "signal"
  const isTerminal = buttonFormat === "terminal"
  const isPoster = buttonFormat === "poster" || coverFormat === "poster"
  const isVinyl = coverFormat === "vinyl"
  const isCassette = coverFormat === "cassette"
  const isCinema = bgStyle === "cinema" || buttonFormat === "cinema" || coverFormat === "cinema"
  const isCapsule = buttonFormat === "capsule"
  const isGrid = buttonFormat === "grid"
  const isNeon = bgStyle === "neon" || buttonFormat === "neon"
  const isFilm = bgStyle === "film" || buttonFormat === "film"
  const isInkblot = buttonFormat === "inkblot"
  const isCarbon = bgStyle === "carbon" || buttonFormat === "carbon"
  const isSunset = bgStyle === "sunset" || buttonFormat === "sunset"
  const isGraffiti = bgStyle === "graffiti" || buttonFormat === "graffiti"
  const isStage = bgStyle === "stage" || buttonFormat === "stage"
  const isRave = bgStyle === "rave" || buttonFormat === "rave"

  /** Светлый шелл (как старый isLightSmartlinkPreset). */
  const shellLight = bgStyle === "sheet" || bgStyle === "diary" || bgStyle === "zine"
  /** Белая карточка только у «Лист». */
  const isSheetCard = bgStyle === "sheet"
  const contentLight = shellLight || isTicket

  const isBlurBg =
    bgStyle === "blur" ||
    bgStyle === "glass" ||
    bgStyle === "film" ||
    bgStyle === "neon" ||
    bgStyle === "holo"

  return {
    ...pack,
    shellLight,
    isSheetCard,
    contentLight,
    isBlurBg,
    isGlassCard,
    isSignal,
    isTicket,
    isPolaroid,
    isArcade,
    isVhs,
    isZine,
    isChrome,
    isNoir,
    isOrbit,
    isStamp,
    isHolo,
    isDiary,
    isTerminal,
    isPoster,
    isVinyl,
    isCassette,
    isCinema,
    isCapsule,
    isGrid,
    isNeon,
    isFilm,
    isInkblot,
    isCarbon,
    isSunset,
    isGraffiti,
    isStage,
    isRave,
    usePaperTear: hoverEffect === "paperTearV" || hoverEffect === "paperTearH",
    paperTearVertical: hoverEffect === "paperTearV",
  }
}

export type SmartlinkVisualFlags = ReturnType<typeof resolveSmartlinkVisualFlags>
