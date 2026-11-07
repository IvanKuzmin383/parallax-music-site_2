"use client"

import AiCoverLanding from "@/components/cabinet/design/ai-cover-landing"
import YandexVideoshotLanding from "@/components/cabinet/design/yandex-videoshot-landing"
import VerticalVideoLanding from "@/components/cabinet/design/vertical-video-landing"
import { LyricsSyncLanding } from "@/components/cabinet/design/lyrics-sync-landing"
import { VkAdsLanding } from "@/components/cabinet/promotion/vk-ads-landing"
import { YandexAdsLanding } from "@/components/cabinet/promotion/yandex-ads-landing"
import { TiktokLanding } from "@/components/cabinet/promotion/tiktok-landing"
import { PlaylisthubLanding } from "@/components/cabinet/promotion/playlisthub-landing"
import { RadioLanding } from "@/components/cabinet/promotion/radio-landing"
import AiMasteringPage from "@/app/cabinet/promotion/ai-mastering/page"
import { PublicServiceLanding } from "@/components/cabinet/shared/service-landing-mode"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { PUBLIC_LANDINGS, type PublicLandingKey } from "@/lib/marketing/public-landings"

function LandingBody({ landing }: { landing: PublicLandingKey }) {
  switch (landing) {
    case "ai-covers":
      return <AiCoverLanding />
    case "video-shots":
      return <YandexVideoshotLanding />
    case "vertical-videos":
      return <VerticalVideoLanding />
    case "ai-mastering":
      return <AiMasteringPage />
    case "lyrics-sync":
      return withService("lyrics-sync", (s) => <LyricsSyncLanding service={s} />)
    case "vk-ads":
      return withService("vk-ads", (s) => <VkAdsLanding service={s} />)
    case "yandex-direct":
      return withService("yandex-ads", (s) => <YandexAdsLanding service={s} />)
    case "tiktok-shorts":
      return withService("tiktok", (s) => <TiktokLanding service={s} />)
    case "yandex-playlists":
      return withService("playlists", (s) => <PlaylisthubLanding service={s} />)
    case "radio":
      return withService("radio", (s) => <RadioLanding service={s} />)
  }
}

function withService(
  slug: string,
  render: (service: NonNullable<ReturnType<typeof getServiceBySlug>>) => React.ReactNode,
) {
  const service = getServiceBySlug(slug)
  return service ? render(service) : null
}

export function PublicLandingView({ landing }: { landing: PublicLandingKey }) {
  return (
    <PublicServiceLanding cabinetPath={PUBLIC_LANDINGS[landing].cabinetPath}>
      <LandingBody landing={landing} />
    </PublicServiceLanding>
  )
}
