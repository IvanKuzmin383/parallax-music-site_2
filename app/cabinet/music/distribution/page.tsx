"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { MusicReleasesPageContent } from "@/components/cabinet/releases/releases-page-content"
import { VideoClipsPageContent } from "@/components/cabinet/videos/video-clips-page-content"

function DistributionPageInner() {
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab")
  if (tab === "videos") return <VideoClipsPageContent />
  return <MusicReleasesPageContent />
}

export default function MusicDistributionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <DistributionPageInner />
    </Suspense>
  )
}
