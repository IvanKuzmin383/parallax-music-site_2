import { Metadata } from "next"
import { CabinetSubscriptionExpiredGuard } from "@/components/cabinet-subscription-expired-guard"
import { CabinetSessionProvider } from "@/lib/cabinet/hooks/cabinet-session-provider"
import { CabinetRouteShell } from "@/components/cabinet/shell/cabinet-route-shell"
import { CabinetThemeRoot } from "@/components/cabinet/shell/cabinet-theme-root"

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
        <CabinetThemeRoot />
        <div className="cabinet-theme min-h-screen bg-background text-foreground">
          <CabinetRouteShell>{children}</CabinetRouteShell>
        </div>
      </CabinetSessionProvider>
    </CabinetSubscriptionExpiredGuard>
  )
}
