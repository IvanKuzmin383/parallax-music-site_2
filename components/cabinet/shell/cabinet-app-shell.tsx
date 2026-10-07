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
      <SidebarInset>
        <CabinetTopbar />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
      <CabinetAnnouncementsHost />
      <CabinetSupportChat />
    </SidebarProvider>
  )
}
