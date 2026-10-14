import { RadioLanding } from "@/components/cabinet/promotion/radio-landing"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { notFound } from "next/navigation"

export default function RadioPromotionPage() {
  const service = getServiceBySlug("radio")
  if (!service) notFound()
  return <RadioLanding service={service} />
}
