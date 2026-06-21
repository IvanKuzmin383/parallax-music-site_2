import { ServicePageTemplate } from "@/components/cabinet/services/service-page-template"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { notFound } from "next/navigation"

function ServicePage({ slug }: { slug: string }) {
  const service = getServiceBySlug(slug)
  if (!service) notFound()
  return <ServicePageTemplate service={service} />
}

export default function VkPromotionPage() {
  return <ServicePage slug="vk-ads" />
}
