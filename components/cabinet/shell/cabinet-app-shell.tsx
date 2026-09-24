"use client"

import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { CabinetSidebar } from "./cabinet-sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { CabinetAnnouncementsHost } from "@/components/cabinet-announcements-host"

interface CabinetAppShellProps {
  children: React.ReactNode
}

function tariffLabel(user: {
  subscriptionName?: string
  subscriptionExpiresAt?: string
} | null): string {
  if (!user?.subscriptionName) return "Тариф не выбран"
  if (user.subscriptionName === "Fix" || !user.subscriptionExpiresAt) {
    return user.subscriptionName
  }
  const until = format(new Date(user.subscriptionExpiresAt), "d MMM", { locale: ru })
  return `${user.subscriptionName} · до ${until}`
}

export function CabinetAppShell({ children }: CabinetAppShellProps) {
  const { user, logout } = useCabinetSession()

  return (
    <SidebarProvider>
      <CabinetSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 items-center justify-between gap-2 min-w-0">
            <p className="text-sm text-muted-foreground truncate hidden sm:block">
              {user?.email ?? "Личный кабинет"}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/cabinet/settings"
                className="inline-flex max-w-[11rem] sm:max-w-[14rem] items-center truncate rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                title="Настройки тарифа"
              >
                {tariffLabel(user)}
              </Link>
              <Button size="sm" variant="outline" onClick={() => void logout()} className="uppercase tracking-wider text-xs">
                Выйти
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
      <CabinetAnnouncementsHost />
    </SidebarProvider>
  )
}
