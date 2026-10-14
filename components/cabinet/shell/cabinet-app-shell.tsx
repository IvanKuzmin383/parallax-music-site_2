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
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <CabinetSidebar />
      <SidebarInset className="cabinet-shell-main max-h-svh min-h-0 overflow-hidden bg-transparent">
        <CabinetTopbar />
        <main className="relative min-h-0 min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 sm:px-4 md:px-6 md:py-6">
          {children}
        </main>
      </SidebarInset>
      <CabinetAnnouncementsHost />
      <CabinetSupportChat />
    </SidebarProvider>
  )
}
