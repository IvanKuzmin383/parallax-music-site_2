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
  isCabinetDistributionPath,
  isCabinetFinancePath,
  isCabinetPromotionPath,
  isCabinetPublickaPath,
  isCabinetToolsPath,
} from "@/lib/cabinet/navigation"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { cn } from "@/lib/utils"

function isActive(href: string, pathname: string): boolean {
  if (href === "/cabinet") return pathname === "/cabinet"
  if (href === "/cabinet/finance/balance") return isCabinetFinancePath(pathname)
  if (href === "/cabinet/distribution/music") return isCabinetDistributionPath(pathname)
  if (href === "/cabinet/publicka") return isCabinetPublickaPath(pathname)
  if (href === "/cabinet/promotion") return isCabinetPromotionPath(pathname)
  if (href === "/cabinet/tools") return isCabinetToolsPath(pathname)
  if (href === "/cabinet/music-stats") {
    return pathname === "/cabinet/music-stats" || pathname.startsWith("/cabinet/music-stats/")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
        "bg-primary/15 ring-1 ring-inset ring-primary/35",
        "shadow-[0_0_18px_-4px_var(--cabinet-glow,rgba(220,50,40,0.4))]",
        className,
      )}
      aria-hidden
    >
      <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
      <span className="absolute inset-[7px] rounded-full border border-primary/40" />
    </span>
  )
}

export function CabinetSidebar() {
  const pathname = usePathname() ?? ""
  const { logout } = useCabinetSession()

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="border-b border-sidebar-border/80 px-2 py-3">
        <div className="flex items-center gap-0.5">
          <SidebarMenu className="min-w-0 flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="h-11 gap-2.5 px-2">
                <Link href="/" aria-label="Parallax Music">
                  <BrandMark />
                  <span className="min-w-0 truncate font-bold tracking-tight text-[15px]">
                    <span className="text-sidebar-foreground">PARALLAX</span>
                    <span className="ml-1 text-primary">MUSIC</span>
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger className="shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent className="cabinet-sidebar-scroll gap-0 overflow-x-hidden">
        {CABINET_SIDEBAR_GROUPS.map((group, groupIndex) => (
          <SidebarGroup
            key={group.id}
            className={cn(groupIndex > 0 && "mt-1.5 pt-1.5", group.label && "pt-1")}
          >
            {group.label ? (
              <SidebarGroupLabel className="h-auto px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                {group.label}
              </SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href, pathname)}
                      tooltip={item.label}
                      className="h-9 gap-3 rounded-lg px-3 text-[14px] transition-colors duration-200"
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

      <SidebarFooter className="border-t border-sidebar-border/80">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Выйти"
              className="h-9 gap-3 rounded-lg px-3 text-[14px] text-muted-foreground hover:text-rose-300"
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
