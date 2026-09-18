"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  CABINET_SIDEBAR_GROUPS,
  isCabinetFinancePath,
  isCabinetPromotionPath,
  isCabinetToolsPath,
} from "@/lib/cabinet/navigation"
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

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <span className="font-bold tracking-tighter text-base">
                  <span className="text-sidebar-foreground">PARALLAX</span>
                  <span className="text-sidebar-primary ml-1">MUSIC</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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

      <SidebarRail />
    </Sidebar>
  )
}
