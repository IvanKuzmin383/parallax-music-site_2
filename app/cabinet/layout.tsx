import { Metadata } from "next"
import { CabinetSubscriptionExpiredGuard } from "@/components/cabinet-subscription-expired-guard"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  robots: "noindex, nofollow",
}

export default function CabinetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <CabinetSubscriptionExpiredGuard>{children}</CabinetSubscriptionExpiredGuard>
}
