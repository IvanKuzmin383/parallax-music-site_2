import { Metadata } from "next"
import { CabinetSubscriptionExpiredGuard } from "@/components/cabinet-subscription-expired-guard"
import { CabinetSessionProvider } from "@/lib/cabinet/hooks/cabinet-session-provider"
import { CabinetKycProvider } from "@/components/cabinet/kyc/cabinet-kyc-provider"
import { CabinetRouteShell } from "@/components/cabinet/shell/cabinet-route-shell"
import { CabinetThemeRoot } from "@/components/cabinet/shell/cabinet-theme-root"
import { CABINET_THEME_BOOTSTRAP_SCRIPT } from "@/lib/cabinet/cabinet-theme"

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
        <CabinetKycProvider>
          <script
            dangerouslySetInnerHTML={{ __html: CABINET_THEME_BOOTSTRAP_SCRIPT }}
          />
          <CabinetThemeRoot>
            <div className="min-h-screen bg-background text-foreground">
              <CabinetRouteShell>{children}</CabinetRouteShell>
            </div>
          </CabinetThemeRoot>
        </CabinetKycProvider>
      </CabinetSessionProvider>
    </CabinetSubscriptionExpiredGuard>
  )
}
