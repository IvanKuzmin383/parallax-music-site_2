"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { CABINET_SIDEBAR_NAV, isCabinetFinancePath } from "@/lib/cabinet/navigation"

function isActive(href: string, pathname: string): boolean {
  if (href === "/cabinet") return pathname === "/cabinet"
  if (href === "/cabinet/finance/balance") return isCabinetFinancePath(pathname)
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

      <SidebarContent className="cabinet-sidebar-scroll">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {CABINET_SIDEBAR_NAV.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild isActive={isActive(item.href, pathname)} tooltip={item.label}>
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
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        <p className="text-[11px] text-muted-foreground px-2 leading-snug">
          Услуги — на странице релиза или в{" "}
          <Link href="/cabinet/services" className="text-primary hover:underline">
            каталоге
          </Link>
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
