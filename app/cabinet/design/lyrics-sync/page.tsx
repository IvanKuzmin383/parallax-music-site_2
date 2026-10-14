import { LyricsSyncLanding } from "@/components/cabinet/design/lyrics-sync-landing"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { notFound } from "next/navigation"

export default function LyricsSyncPage() {
  const service = getServiceBySlug("lyrics-sync")
  if (!service) notFound()
  return <LyricsSyncLanding service={service} />
}
