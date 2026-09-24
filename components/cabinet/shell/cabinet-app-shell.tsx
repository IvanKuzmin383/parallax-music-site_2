"use client"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { CabinetSidebar } from "./cabinet-sidebar"
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
        <div className="absolute left-3 top-3 z-20 md:hidden">
          <SidebarTrigger />
        </div>
        <main className="flex-1 p-4 pt-14 md:p-6 md:pt-6 lg:p-8">{children}</main>
      </SidebarInset>
      <CabinetAnnouncementsHost />
      <CabinetSupportChat />
    </SidebarProvider>
  )
}
