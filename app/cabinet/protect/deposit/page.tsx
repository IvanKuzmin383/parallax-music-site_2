import { DepositLanding } from "@/components/cabinet/protect/deposit-landing"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { notFound } from "next/navigation"

export default function ProtectDepositPage() {
  const service = getServiceBySlug("deposit")
  if (!service) notFound()
  return <DepositLanding service={service} />
}
