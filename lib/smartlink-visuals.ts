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

/**
 * Флаги для лендинга.
 * Слои независимы: фон (bg*), кнопки (btn* / короткие is* для кнопок), обложка (cover*).
 * Раньше `isVhs = bg || buttons` ломало конструктор - фон VHS красил кнопки и обложку.
 */
export function resolveSmartlinkVisualFlags(theme: SmartlinkThemeVisualInput) {
  const pack = resolveSmartlinkVisualPack(theme)
  const { bgStyle, buttonFormat, coverFormat, hoverEffect } = pack

  /** Фон страницы / шелл / оверлеи. */
  const bgArcade = bgStyle === "arcade"
  const bgVhs = bgStyle === "vhs"
  const bgZine = bgStyle === "zine"
  const bgChrome = bgStyle === "chrome"
  const bgNoir = bgStyle === "noir"
  const bgStamp = bgStyle === "stamp"
  const bgHolo = bgStyle === "holo"
  const bgDiary = bgStyle === "diary"
  const bgNeon = bgStyle === "neon"
  const bgFilm = bgStyle === "film"
  const bgCarbon = bgStyle === "carbon"
  const bgSunset = bgStyle === "sunset"
  const bgGraffiti = bgStyle === "graffiti"
  const bgStage = bgStyle === "stage"
  const bgRave = bgStyle === "rave"
  const bgPolaroid = bgStyle === "polaroid"
  const bgCinema = bgStyle === "cinema"

  /** Характер кнопок стримов - только buttonFormat. */
  const isArcade = buttonFormat === "arcade"
  const isVhs = buttonFormat === "vhs"
  const isZine = buttonFormat === "zine"
  const isChrome = buttonFormat === "chrome"
  const isNoir = buttonFormat === "noir"
  const isStamp = buttonFormat === "stamp"
  const isHolo = buttonFormat === "holo"
  const isDiaryBtn = buttonFormat === "diary"
  const isNeon = buttonFormat === "neon"
  const isFilm = buttonFormat === "film"
  const isCarbon = buttonFormat === "carbon"
  const isSunset = buttonFormat === "sunset"
  const isGraffiti = buttonFormat === "graffiti"
  const isStage = buttonFormat === "stage"
  const isRave = buttonFormat === "rave"
  const isTerminal = buttonFormat === "terminal"
  const isCapsule = buttonFormat === "capsule"
  const isGrid = buttonFormat === "grid"
  const isInkblot = buttonFormat === "inkblot"
  const isPosterBtn = buttonFormat === "poster"
  const isCinemaBtn = buttonFormat === "cinema"
  const isPolaroidBtn = buttonFormat === "polaroid"
  const isTicketBtn = buttonFormat === "ticket"

  /** Форма / раскладка обложки - только coverFormat. */
  const isOrbit = coverFormat === "orbit"
  const isVinyl = coverFormat === "vinyl"
  const isCassette = coverFormat === "cassette"
  const isPosterCover = coverFormat === "poster"
  const isPolaroidCover = coverFormat === "polaroid"
  const isCinemaCover = coverFormat === "cinema"
  const isDiaryCover = coverFormat === "diary"
  const isTicketCover = coverFormat === "ticket"

  /** Совместимость: кнопка или обложка в формате билета (не фон!). */
  const isTicket = isTicketBtn || isTicketCover
  /** Постер/полароид для скрытия titleBlock - только обложка. */
  const isPoster = isPosterCover
  const isPolaroid = isPolaroidCover
  /** Cinema letterbox на странице - фон; cinema-кнопки - отдельно. */
  const isCinema = isCinemaBtn
  /** Diary-кнопки; diary-фон/обложка - через bg* / cover*. */
  const isDiary = isDiaryBtn

  const isGlassCard = bgStyle === "glass"
  const isSignal = bgStyle === "signal"

  /** Светлый шелл (как старый isLightSmartlinkPreset). */
  const shellLight = bgStyle === "sheet" || bgStyle === "diary" || bgStyle === "zine"
  /** Белая карточка только у "Лист". */
  const isSheetCard = bgStyle === "sheet"
  /**
   * Цвет текста/кнопок на странице - только от фона.
   * Нельзя OR-ить с buttonFormat/coverFormat (Билет/Полароид и т.п.) - иначе "формат кнопок" красит фон.
   */
  const contentLight = shellLight

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
    // bg layer
    bgArcade,
    bgVhs,
    bgZine,
    bgChrome,
    bgNoir,
    bgStamp,
    bgHolo,
    bgDiary,
    bgNeon,
    bgFilm,
    bgCarbon,
    bgSunset,
    bgGraffiti,
    bgStage,
    bgRave,
    bgPolaroid,
    bgCinema,
    // button layer (короткие имена - для стилей кнопок)
    isTicket,
    isTicketBtn,
    isTicketCover,
    isPolaroid,
    isPolaroidBtn,
    isPolaroidCover,
    isArcade,
    isVhs,
    isZine,
    isChrome,
    isNoir,
    isOrbit,
    isStamp,
    isHolo,
    isDiary,
    isDiaryBtn,
    isDiaryCover,
    isTerminal,
    isPoster,
    isPosterBtn,
    isPosterCover,
    isVinyl,
    isCassette,
    isCinema,
    isCinemaBtn,
    isCinemaCover,
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
