"use client"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { CabinetSidebar } from "./cabinet-sidebar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { CabinetAnnouncementsHost } from "@/components/cabinet-announcements-host"

interface CabinetAppShellProps {
  children: React.ReactNode
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
            <Button size="sm" variant="outline" onClick={() => void logout()} className="shrink-0 uppercase tracking-wider text-xs">
              Выйти
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
      <CabinetAnnouncementsHost />
    </SidebarProvider>
  )
}
