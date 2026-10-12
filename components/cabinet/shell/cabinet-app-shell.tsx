"use client"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { CabinetSidebar } from "./cabinet-sidebar"
import { CabinetTopbar } from "./cabinet-topbar"
import { CabinetAnnouncementsHost } from "@/components/cabinet-announcements-host"
import { CabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"

interface CabinetAppShellProps {
  children: React.ReactNode
}

export function CabinetAppShell({ children }: CabinetAppShellProps) {
  return (
    <SidebarProvider>
      <CabinetSidebar />
      <SidebarInset className="cabinet-shell-main bg-transparent">
        <CabinetTopbar />
        <main className="relative min-w-0 w-full flex-1 px-3 py-4 sm:px-4 md:px-6 md:py-6">
          {children}
        </main>
      </SidebarInset>
      <CabinetAnnouncementsHost />
      <CabinetSupportChat />
    </SidebarProvider>
  )
}
