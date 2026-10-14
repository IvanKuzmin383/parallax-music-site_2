"use client"

import type { VkAdsGoalConfig } from "@/lib/vk-ads-campaign"
import { cn } from "@/lib/utils"

const VK_UI_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif'

type VkAdsAdPreviewProps = {
  goal: VkAdsGoalConfig
  projectName: string
  className?: string
}

function BatteryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="25" height="12" viewBox="0 0 25 12" aria-hidden="true">
      <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke="currentColor" fill="none" />
      <rect x="2" y="2" width="15" height="8" rx="1" fill="currentColor" />
      <path d="M23 4v4a1.5 1.5 0 0 0 0-4z" fill="currentColor" />
    </svg>
  )
}

function SignalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="17" height="12" viewBox="0 0 17 12" aria-hidden="true">
      <rect x="0" y="8" width="3" height="4" rx="0.5" fill="currentColor" />
      <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.5" fill="currentColor" />
      <rect x="9" y="3" width="3" height="9" rx="0.5" fill="currentColor" />
      <rect x="13.5" y="0.5" width="3" height="11.5" rx="0.5" fill="currentColor" />
    </svg>
  )
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
      <path
        d="M8 9.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Zm0-3.2a4 4 0 0 1 2.7 1.05l-.9.95A2.7 2.7 0 0 0 8 7.7c-.7 0-1.35.25-1.85.7l-.9-.95A4 4 0 0 1 8 6.4Zm0-3.2a7.2 7.2 0 0 1 5.1 2.1l-.95.95A5.85 5.85 0 0 0 8 4.55c-1.7 0-3.25.7-4.15 1.8L2.9 5.4A7.2 7.2 0 0 1 8 3.2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12.1 20.15c-.15.05-.35.05-.5 0C8.1 18.75 3 14.85 3 9.95 3 7.15 5.2 5 7.95 5c1.55 0 3.05.75 4.05 1.95C13 5.75 14.5 5 16.05 5 18.8 5 21 7.15 21 9.95c0 4.9-5.1 8.8-8.9 10.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CommentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 18.5 4.5 21V7.5A2.5 2.5 0 0 1 7 5h10a2.5 2.5 0 0 1 2.5 2.5v8A2.5 2.5 0 0 1 17 18H7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Узнаваемая стрелка репоста VK, не бумажный самолётик. */
function RepostIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16.5 4.5 20.5 8l-4 3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 12.5V11a4 4 0 0 1 4-4h12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 19.5 3.5 16l4-3.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 11.5V13a4 4 0 0 1-4 4h-12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ViewsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M1.5 9s2.7-4.5 7.5-4.5S16.5 9 16.5 9s-2.7 4.5-7.5 4.5S1.5 9 1.5 9Z"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function EmojiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8.25" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8.2" cy="9.2" r="1" fill="currentColor" />
      <circle cx="13.8" cy="9.2" r="1" fill="currentColor" />
      <path
        d="M7.6 12.8c.9 1.35 2.1 2 3.4 2s2.5-.65 3.4-2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ReleaseArtwork({ imageLabel }: { imageLabel: string }) {
  return (
    <div
      className="relative aspect-video w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 90% at 20% 10%, #ff6b8a 0%, transparent 55%), linear-gradient(145deg, #c41e4a 0%, #8b1538 42%, #4a0d28 100%)",
      }}
      aria-hidden="true"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 78% 22%, rgba(255,255,255,0.18) 0%, transparent 42%), radial-gradient(circle at 18% 78%, rgba(255,180,200,0.2) 0%, transparent 40%)",
        }}
      />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
        viewBox="0 0 320 180"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M-20 140 C60 40, 140 160, 220 70 S360 20, 380 90"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.2"
        />
        <path
          d="M-10 160 C80 70, 150 150, 240 90 S350 40, 390 110"
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85"
          style={{ fontFamily: VK_UI_FONT }}
        >
          {imageLabel}
        </p>
        <p
          className="mt-1.5 text-[22px] font-bold leading-none tracking-tight text-white"
          style={{ fontFamily: VK_UI_FONT }}
        >
          СВОЙ РИТМ.
        </p>
        <p
          className="mt-2 text-[9px] font-medium uppercase tracking-[0.14em] text-white/75"
          style={{ fontFamily: VK_UI_FONT }}
        >
          ВАША МУЗЫКА · ВАША ИСТОРИЯ
        </p>
      </div>
    </div>
  )
}

export function VkAdsAdPreview({ goal, projectName, className }: VkAdsAdPreviewProps) {
  const releaseTitle = projectName.trim() || "Ваш релиз"

  return (
    <div className={cn("mx-auto w-full max-w-[306px]", className)}>
      <figure className="m-0">
        <div
          className="mx-auto w-full max-w-[306px] rounded-[36px] border-[3px] border-[#1A1A1F] bg-[#0C0C10] p-[10px] shadow-[0_20px_48px_-24px_rgba(0,0,0,0.85)]"
          role="img"
          aria-label={`Пример рекламной записи ВКонтакте: цель «${goal.title}», релиз «${releaseTitle}»`}
        >
          <div
            className="overflow-hidden rounded-[26px] bg-white text-[#222222]"
            style={{ fontFamily: VK_UI_FONT }}
          >
            {/* Status bar */}
            <div
              className="relative flex h-11 items-end justify-between px-5 pb-1.5 text-[12px] font-semibold text-[#222222]"
              aria-hidden="true"
            >
              <span className="min-w-[2.5rem]">9:41</span>
              <div className="absolute left-1/2 top-1.5 h-[22px] w-[90px] -translate-x-1/2 rounded-full bg-[#0C0C10]" />
              <div className="flex items-center gap-1 text-[#222222]">
                <SignalIcon className="h-3 w-[17px]" />
                <WifiIcon className="h-3 w-4" />
                <BatteryIcon className="h-3 w-[25px]" />
              </div>
            </div>

            {/* App nav */}
            <div
              className="flex h-11 items-center justify-between border-b border-[#E7E8EC] px-2"
              aria-hidden="true"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center text-[#0077FF]">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M12.5 4.5 7 10l5.5 5.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-[16px] font-medium leading-none text-[#222222]">Запись</span>
              <span className="inline-flex h-10 w-10 items-center justify-center text-[#222222]">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
                  <circle cx="9" cy="3.5" r="1.4" />
                  <circle cx="9" cy="9" r="1.4" />
                  <circle cx="9" cy="14.5" r="1.4" />
                </svg>
              </span>
            </div>

            {/* Author */}
            <div className="flex items-start gap-2.5 px-3 pt-3" aria-hidden="true">
              <div className="h-[38px] w-[38px] shrink-0 rounded-full bg-gradient-to-br from-[#7BA7D0] to-[#3B6FA0]" />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium leading-tight text-[#2A5885]">
                      Ваш артист
                    </p>
                    <p className="mt-0.5 text-[12px] leading-none text-[#6D7885]">Реклама</p>
                  </div>
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center text-[#99A2AD]">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <circle cx="8" cy="3" r="1.25" />
                      <circle cx="8" cy="8" r="1.25" />
                      <circle cx="8" cy="13" r="1.25" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>

            {/* Post text */}
            <p className="break-words px-3 pt-2.5 text-[14px] leading-[1.35] text-[#222222]">
              {goal.postText}
            </p>

            {/* Ad image + CTA block */}
            <div className="mt-2.5 border-y border-[#E7E8EC]">
              <ReleaseArtwork imageLabel={goal.imageLabel} />
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-[13px] font-medium leading-snug text-[#222222]">
                    {releaseTitle}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-none text-[#6D7885]">{goal.destination}</p>
                </div>
                <span
                  className="inline-flex h-8 shrink-0 items-center rounded-[8px] bg-[#0077FF] px-3 text-[13px] font-medium text-white"
                  aria-hidden="true"
                >
                  {goal.ctaLabel}
                </span>
              </div>
            </div>

            {/* Reactions */}
            <div
              className="flex items-center justify-between px-3 py-2.5 text-[#818C99]"
              aria-hidden="true"
            >
              <div className="flex items-center gap-4">
                <HeartIcon className="h-6 w-6" />
                <CommentIcon className="h-6 w-6" />
                <RepostIcon className="h-6 w-6" />
              </div>
              <ViewsIcon className="h-[18px] w-[18px]" />
            </div>

            {/* Comment field */}
            <div
              className="flex items-center gap-2 border-t border-[#E7E8EC] px-3 py-2.5"
              aria-hidden="true"
            >
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-[#C4CDD6] to-[#8E9AA8]" />
              <div className="flex h-9 min-w-0 flex-1 items-center justify-between rounded-full bg-[#F2F3F5] px-3">
                <span className="truncate text-[13px] text-[#818C99]">Написать комментарий…</span>
                <EmojiIcon className="h-[22px] w-[22px] shrink-0 text-[#99A2AD]" />
              </div>
            </div>

            {/* Home indicator */}
            <div className="flex justify-center pb-2 pt-1" aria-hidden="true">
              <div className="h-1 w-[108px] rounded-full bg-[#222222]/85" />
            </div>
          </div>
        </div>
      </figure>
    </div>
  )
}
