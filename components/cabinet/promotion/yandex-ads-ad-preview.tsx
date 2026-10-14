"use client"

import type { YandexAdsObjectConfig } from "@/lib/yandex-ads-campaign"
import { cn } from "@/lib/utils"

const AD_UI_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'

export type YandexAdsPreviewMode = "sites" | "search"

type YandexAdsAdPreviewProps = {
  object: YandexAdsObjectConfig
  projectName: string
  mode: YandexAdsPreviewMode
  onModeChange: (mode: YandexAdsPreviewMode) => void
  className?: string
}

function BrowserChrome({ title }: { title: string }) {
  return (
    <div
      className="flex h-9 items-center gap-2 border-b border-[#E7E8EC] bg-[#F7F7F8] px-3"
      aria-hidden="true"
    >
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
      </div>
      <p className="min-w-0 flex-1 truncate text-center text-[11px] font-medium text-[#6D7885]">
        {title}
      </p>
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-[#99A2AD]">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 4.5h10M2 7h10M2 9.5h10"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </div>
  )
}

function AdArtwork({ object }: { object: YandexAdsObjectConfig }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-[6px]"
      style={{ aspectRatio: "1.65 / 1" }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, #F4EDE3 0%, #EDE4D6 48%, #E6DCCE 100%)",
        }}
      />
      {/* Vinyl fragment on the right */}
      <div
        className="absolute -right-[18%] top-1/2 h-[140%] w-[70%] -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 42% 48%, #2A2A2E 0%, #1A1A1E 38%, #0E0E12 72%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="absolute left-[28%] top-1/2 h-[34%] w-[34%] -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, #C45A4A 0%, #8B2E2E 55%, #5A1A1A 100%)",
          }}
        />
        <div
          className="absolute inset-[12%] rounded-full border border-white/10"
          style={{ boxShadow: "inset 0 0 0 18px rgba(255,255,255,0.03)" }}
        />
      </div>
      <div className="relative z-[1] flex h-full max-w-[58%] flex-col justify-center px-3 py-3 sm:px-3.5">
        <p
          className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#5A534C]"
          style={{ fontFamily: AD_UI_FONT }}
        >
          {object.imageTopLabel}
        </p>
        <p
          className="mt-1.5 text-[17px] font-bold leading-[1.05] tracking-tight text-[#1C1916] sm:text-[18px]"
          style={{ fontFamily: AD_UI_FONT }}
        >
          {object.imageLines[0]}
          <br />
          {object.imageLines[1]}
        </p>
        <p
          className="mt-2 text-[8px] font-medium uppercase tracking-[0.12em] text-[#6D645C]"
          style={{ fontFamily: AD_UI_FONT }}
        >
          ВАШ АРТИСТ · ВАША ИСТОРИЯ
        </p>
      </div>
    </div>
  )
}

function SitesAd({
  object,
  headline,
}: {
  object: YandexAdsObjectConfig
  headline: string
}) {
  return (
    <div className="bg-[#F3F1EC] px-3 pb-3 pt-3" style={{ fontFamily: AD_UI_FONT }}>
      <div className="mb-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7A736A]">
          МУЗЫКА И КУЛЬТУРА
        </p>
        <p className="mt-1 text-[13px] font-medium leading-snug text-[#2A2622]">
          Новые имена. Музыка, которую стоит открыть.
        </p>
      </div>

      <div className="overflow-hidden rounded-[8px] border border-[#E1DCD4] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <AdArtwork object={object} />
        <div className="flex items-center justify-between gap-2 border-b border-[#E7E8EC] px-2.5 py-1.5">
          <span className="text-[11px] text-[#818C99]">Реклама</span>
          <span className="inline-flex h-5 w-5 items-center justify-center text-[#99A2AD]" aria-hidden>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="6" cy="2.2" r="1" />
              <circle cx="6" cy="6" r="1" />
              <circle cx="6" cy="9.8" r="1" />
            </svg>
          </span>
        </div>
        <div className="space-y-2 px-2.5 py-2.5">
          <p className="break-words text-[14px] font-semibold leading-snug text-[#222222]">
            {headline}
          </p>
          <p className="text-[12px] leading-relaxed text-[#5A5A5A]">{object.adDescription}</p>
          <span
            className="inline-flex h-8 min-h-8 items-center rounded-[6px] bg-[#FFDD2D] px-3 text-[13px] font-medium text-[#1A1A1A]"
            aria-hidden="true"
          >
            {object.ctaLabel}
          </span>
        </div>
      </div>
    </div>
  )
}

function SearchAd({
  object,
  headline,
}: {
  object: YandexAdsObjectConfig
  headline: string
}) {
  return (
    <div className="bg-white px-3 pb-3 pt-3" style={{ fontFamily: AD_UI_FONT }}>
      <p className="text-center text-[22px] font-medium tracking-tight text-[#222222]">
        <span className="text-[#FC3F1D]">Я</span>ндекс
      </p>
      <div
        className="mt-2.5 flex h-10 items-center rounded-full border-2 border-[#FFDD2D] bg-white px-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
        aria-hidden="true"
      >
        <span className="truncate text-[13px] text-[#222222]">{object.searchQuery}</span>
      </div>

      <div className="mt-3.5 space-y-1 border-b border-[#E7E8EC] pb-3">
        <p className="text-[11px] text-[#818C99]">Реклама</p>
        <p className="break-words text-[15px] font-medium leading-snug text-[#0B57D0]">
          {headline}
        </p>
        <p className="text-[12px] text-[#6D7885]">{object.destination}</p>
        <p className="text-[12px] leading-relaxed text-[#222222]">{object.adDescription}</p>
        <p className="pt-0.5 text-[12px] font-medium text-[#0B57D0]" aria-hidden="true">
          {object.ctaLabel} →
        </p>
      </div>

      <div className="pt-2.5" aria-hidden="true">
        <p className="text-[11px] text-[#99A2AD]">Пример окружения объявления в результатах поиска</p>
        <p className="mt-1.5 text-[14px] text-[#0B57D0]/70">Обычный результат поиска</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-[#6D7885]">
          Краткое описание страницы без рекламной пометки.
        </p>
      </div>
    </div>
  )
}

export function YandexAdsAdPreview({
  object,
  projectName,
  mode,
  onModeChange,
  className,
}: YandexAdsAdPreviewProps) {
  const headline = projectName.trim() || object.defaultHeadline
  const browserTitle = mode === "sites" ? "Сайт о музыке" : "Поиск Яндекса"
  const modeLabel = mode === "sites" ? "на сайтах" : "в поиске"

  return (
    <div className={cn("mx-auto w-full max-w-[415px]", className)}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Яндекс Директ</p>
        <p className="text-xs text-muted-foreground">Пример объявления</p>
      </div>

      <div
        className="mb-3 flex gap-2"
        role="group"
        aria-label="Режим просмотра примера объявления"
      >
        {(
          [
            { id: "sites" as const, label: "На сайтах" },
            { id: "search" as const, label: "В поиске" },
          ] as const
        ).map((item) => {
          const active = mode === item.id
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => onModeChange(item.id)}
              className={cn(
                "h-10 min-h-10 flex-1 rounded-[10px] border px-3 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3264D]/70",
                active
                  ? "border-[#F3264D]/55 bg-[#F3264D]/12 text-foreground"
                  : "border-border bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      <figure className="m-0">
        <div
          className="overflow-hidden rounded-[14px] border border-[#303038] bg-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.75)]"
          role="img"
          aria-label={`Пример объявления Яндекс Директ ${modeLabel}: «${headline}». Назначение - ${object.destination}.`}
        >
          <BrowserChrome title={browserTitle} />
          {mode === "sites" ? (
            <SitesAd object={object} headline={headline} />
          ) : (
            <SearchAd object={object} headline={headline} />
          )}
        </div>

        <p className="mt-3 text-center text-[13px] text-muted-foreground">
          После перехода → {object.destination}
        </p>
        <figcaption className="mt-1.5 text-center text-xs text-muted-foreground">
          Подачу и страницу перехода подберём под вашу задачу.
        </figcaption>
      </figure>
    </div>
  )
}
