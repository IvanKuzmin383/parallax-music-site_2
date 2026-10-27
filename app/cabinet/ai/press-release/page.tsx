import type { Metadata } from "next"
import { ServicePageTemplate } from "@/components/cabinet/services/service-page-template"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default function AiPressReleasePage() {
  const service = getServiceBySlug("press-release")
  if (!service) notFound()
  return <ServicePageTemplate service={service} />
}
