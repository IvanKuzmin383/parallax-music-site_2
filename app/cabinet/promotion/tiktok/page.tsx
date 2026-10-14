import { TiktokLanding } from "@/components/cabinet/promotion/tiktok-landing"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { notFound } from "next/navigation"

export default function TiktokPromotionPage() {
  const service = getServiceBySlug("tiktok")
  if (!service) notFound()
  return <TiktokLanding service={service} />
}
