import { Metadata } from "next"
import { CabinetSubscriptionExpiredGuard } from "@/components/cabinet-subscription-expired-guard"
import { CabinetSessionProvider } from "@/lib/cabinet/hooks/cabinet-session-provider"
import { CabinetRouteShell } from "@/components/cabinet/shell/cabinet-route-shell"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  robots: "noindex, nofollow",
}

export default function CabinetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CabinetSubscriptionExpiredGuard>
      <CabinetSessionProvider>
        <CabinetRouteShell>{children}</CabinetRouteShell>
      </CabinetSessionProvider>
    </CabinetSubscriptionExpiredGuard>
  )
}
