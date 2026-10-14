"use client"

import Image from "next/image"
import { ExternalLink } from "lucide-react"
import {
  PLAYLISTHUB_BASE_PRICE_RUB,
  PLAYLISTHUB_CATALOG_URL,
  PLAYLISTHUB_EXAMPLES,
} from "@/lib/playlisthub-landing"
import { cn } from "@/lib/utils"

const PH_FONT =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'

function PlaylistCard({
  example,
  layout,
}: {
  example: (typeof PLAYLISTHUB_EXAMPLES)[number]
  layout: "square" | "wide"
}) {
  const price = `${PLAYLISTHUB_BASE_PRICE_RUB.toLocaleString("ru-RU")} ₽`
  return (
    <a
      href={example.href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block border border-[#2A2A2A] bg-[#0A0A0A] outline-none transition-colors",
        "hover:border-[#E2DF00]/50 focus-visible:border-[#E2DF00] focus-visible:ring-2 focus-visible:ring-[#E2DF00]/60",
        layout === "wide" && "sm:flex sm:items-stretch",
      )}
      style={{ fontFamily: PH_FONT }}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-[#141414]",
          layout === "wide" ? "aspect-square w-full sm:w-[7.5rem]" : "aspect-square w-full",
        )}
      >
        <Image
          src={example.coverSrc}
          alt={example.coverAlt}
          fill
          sizes={layout === "wide" ? "(max-width: 640px) 100vw, 120px" : "(max-width: 640px) 50vw, 180px"}
          className={cn(
            "object-cover transition-[filter] duration-300",
            "grayscale group-hover:grayscale-0 group-focus-visible:grayscale-0",
            "motion-reduce:transition-none motion-reduce:grayscale-0",
          )}
        />
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col justify-between gap-2 p-3",
          layout === "wide" && "sm:px-4 sm:py-3",
        )}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#FF7244]">
            Яндекс Музыка
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-white">{example.title}</p>
          <p className="mt-0.5 text-xs text-[#A8A8A8]">{example.genre}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-[#E2DF00]">{price}</span>
          <ExternalLink className="h-4 w-4 shrink-0 text-[#A8A8A8]" aria-hidden />
          <span className="sr-only">Открыть на PlaylistHub</span>
        </div>
      </div>
    </a>
  )
}

export function PlaylisthubShowcase({ className }: { className?: string }) {
  const [first, second, third] = PLAYLISTHUB_EXAMPLES

  return (
    <div
      className={cn(
        "w-full max-w-[415px] border border-[#222] bg-[#030303] p-4 sm:p-5",
        className,
      )}
      style={{ fontFamily: PH_FONT }}
    >
      <div className="flex items-end justify-between gap-3">
        <p className="text-sm font-bold tracking-[0.08em] text-white">PLAYLISTHUB</p>
        <p className="text-[11px] text-[#A8A8A8]">Яндекс Музыка</p>
      </div>
      <p className="mt-4 text-[1.35rem] font-bold leading-[1.1] tracking-tight text-white sm:text-[1.5rem]">
        НАЙДИ СВОИХ <span className="text-[#E2DF00]">СЛУШАТЕЛЕЙ</span>
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <PlaylistCard example={first} layout="square" />
        <PlaylistCard example={second} layout="square" />
      </div>
      <div className="mt-2.5">
        <PlaylistCard example={third} layout="wide" />
      </div>

      <a
        href={PLAYLISTHUB_CATALOG_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "mt-4 inline-flex h-11 min-h-11 w-full items-center justify-center",
          "bg-[#E2DF00] px-4 text-sm font-semibold text-black",
          "transition-opacity hover:opacity-90",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2DF00] focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        )}
      >
        Открыть весь каталог
      </a>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-[#8A8A8A]">
        Примеры из каталога · оформление заказа в PlaylistHub
      </p>
    </div>
  )
}
