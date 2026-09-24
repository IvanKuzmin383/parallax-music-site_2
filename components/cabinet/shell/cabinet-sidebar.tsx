"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  CABINET_SIDEBAR_GROUPS,
  isCabinetFinancePath,
  isCabinetPromotionPath,
  isCabinetToolsPath,
} from "@/lib/cabinet/navigation"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { cn } from "@/lib/utils"

function isActive(href: string, pathname: string): boolean {
  if (href === "/cabinet") return pathname === "/cabinet"
  if (href === "/cabinet/finance/balance") return isCabinetFinancePath(pathname)
  if (href === "/cabinet/promotion") return isCabinetPromotionPath(pathname)
  if (href === "/cabinet/tools") return isCabinetToolsPath(pathname)
  if (href === "/cabinet/music-stats") {
    return pathname === "/cabinet/music-stats" || pathname.startsWith("/cabinet/music-stats/")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function CabinetSidebar() {
  const pathname = usePathname() ?? ""
  const { logout } = useCabinetSession()

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
        <div className="flex items-center gap-0.5">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/">
                  <span className="font-bold tracking-tighter text-base truncate">
                    <span className="text-sidebar-foreground">PARALLAX</span>
                    <span className="text-sidebar-primary ml-1">MUSIC</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger className="shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent className="cabinet-sidebar-scroll gap-0">
        {CABINET_SIDEBAR_GROUPS.map((group, groupIndex) => (
          <SidebarGroup
            key={group.id}
            className={cn(groupIndex > 0 && "mt-2 pt-2", group.label && "pt-1")}
          >
            {group.label ? (
              <SidebarGroupLabel className="h-auto px-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href, pathname)}
                      tooltip={item.label}
                      className="h-10 gap-3 px-3 text-[15px]"
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Выйти"
              className="h-10 gap-3 px-3 text-[15px]"
              onClick={() => void logout()}
            >
              <LogOut />
              <span>Выйти</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
