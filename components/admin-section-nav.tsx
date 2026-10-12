"use client"

import Link from "next/link"
import {
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardList,
  Database,
  FileText,
  Film,
  Headset,
  LineChart,
  Megaphone,
  MessageSquare,
  Music,
  Scale,
  Users,
  Wallet,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type AdminSectionNavActive =
  | "articles"
  | "cabinet-users"
  | "cabinet-announcements"
  | "tracks"
  | "reports"
  | "music-stats"
  | "withdrawals"
  | "service-fulfillments"
  | "reviews"
  | "support"
  | "legal-acceptance"
  | "music-track-map"
  | "publicka"
  | "video-clips"

interface AdminSectionNavProps {
  active: AdminSectionNavActive
}

type NavItem = {
  id: AdminSectionNavActive
  label: string
  href: string
  icon: LucideIcon
}

type NavGroup = {
  id: string
  label: string
  items: NavItem[]
}

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: "content",
    label: "Контент",
    items: [
      { id: "articles", label: "Статьи", href: "/admin26081993", icon: FileText },
      { id: "reviews", label: "Отзывы", href: "/admin26081993/reviews", icon: MessageSquare },
    ],
  },
  {
    id: "cabinet",
    label: "Кабинет",
    items: [
      {
        id: "cabinet-users",
        label: "Пользователи",
        href: "/admin26081993/cabinet-users",
        icon: Users,
      },
      {
        id: "cabinet-announcements",
        label: "Новости",
        href: "/admin26081993/cabinet-announcements",
        icon: Megaphone,
      },
      { id: "support", label: "Поддержка", href: "/admin26081993/support", icon: Headset },
      {
        id: "legal-acceptance",
        label: "Оферта",
        href: "/admin26081993/legal-acceptance",
        icon: Scale,
      },
    ],
  },
  {
    id: "distribution",
    label: "Дистрибуция",
    items: [
      { id: "tracks", label: "Треки", href: "/admin26081993/tracks", icon: Music },
      {
        id: "video-clips",
        label: "Видеоклипы",
        href: "/admin26081993/video-clips",
        icon: Film,
      },
    ],
  },
  {
    id: "finance",
    label: "Финансы",
    items: [
      { id: "reports", label: "Отчёты", href: "/admin26081993/reports", icon: BarChart3 },
      {
        id: "withdrawals",
        label: "Выводы",
        href: "/admin26081993/withdrawals",
        icon: Wallet,
      },
      {
        id: "service-fulfillments",
        label: "Заказы услуг",
        href: "/admin26081993/service-fulfillments",
        icon: ClipboardList,
      },
    ],
  },
  {
    id: "stats",
    label: "Статистика",
    items: [
      {
        id: "music-stats",
        label: "Статистика",
        href: "/admin26081993/music-stats",
        icon: LineChart,
      },
      {
        id: "music-track-map",
        label: "Маппинг",
        href: "/admin26081993/music-track-map",
        icon: Database,
      },
      {
        id: "publicka",
        label: "Музыка для бизнеса",
        href: "/admin26081993/publicka",
        icon: Building2,
      },
    ],
  },
]

export function AdminSectionNav({ active }: AdminSectionNavProps) {
  return (
    <div className="sticky top-0 z-40 -mx-4 mb-2 border-b border-border/60 bg-background/95 px-4 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center gap-1.5">
        {ADMIN_NAV_GROUPS.map((group) => {
          const groupActive = group.items.some((item) => item.id === active)
          const activeItem = group.items.find((item) => item.id === active)

          return (
            <DropdownMenu key={group.id}>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant={groupActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(groupActive && "ring-1 ring-primary/35")}
                >
                  {group.label}
                  {groupActive && activeItem ? (
                    <span className="ml-1.5 hidden text-xs font-normal text-muted-foreground sm:inline">
                      · {activeItem.label}
                    </span>
                  ) : null}
                  <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[12rem]">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = item.id === active
                  return (
                    <DropdownMenuItem key={item.id} asChild>
                      <Link
                        href={item.href}
                        prefetch={false}
                        className={cn(
                          "cursor-pointer",
                          isActive && "bg-accent font-medium text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        })}
      </div>
    </div>
  )
}
