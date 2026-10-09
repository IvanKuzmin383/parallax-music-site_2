"use client"

import Link from "next/link"
import {
  BarChart3,
  Building2,
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

import { Button } from "@/components/ui/button"

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

function navVariant(isActive: boolean): "secondary" | "ghost" {
  return isActive ? "secondary" : "ghost"
}

export function AdminSectionNav({ active }: AdminSectionNavProps) {
  return (
    <div className="sticky top-0 z-40 -mx-4 mb-2 border-b border-border/60 bg-background/95 px-4 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={navVariant(active === "articles")} size="sm" asChild>
          <Link href="/admin26081993" prefetch={false}>
            <FileText className="mr-1 h-4 w-4" />
            Статьи
          </Link>
        </Button>
        <Button variant={navVariant(active === "cabinet-users")} size="sm" asChild>
          <Link href="/admin26081993/cabinet-users" prefetch={false}>
            <Users className="mr-1 h-4 w-4" />
            Пользователи ЛК
          </Link>
        </Button>
        <Button variant={navVariant(active === "cabinet-announcements")} size="sm" asChild>
          <Link href="/admin26081993/cabinet-announcements" prefetch={false}>
            <Megaphone className="mr-1 h-4 w-4" />
            Новости ЛК
          </Link>
        </Button>
        <Button variant={navVariant(active === "tracks")} size="sm" asChild>
          <Link href="/admin26081993/tracks" prefetch={false}>
            <Music className="mr-1 h-4 w-4" />
            Треки
          </Link>
        </Button>
        <Button variant={navVariant(active === "reports")} size="sm" asChild>
          <Link href="/admin26081993/reports" prefetch={false}>
            <BarChart3 className="mr-1 h-4 w-4" />
            Отчеты
          </Link>
        </Button>
        <Button variant={navVariant(active === "music-stats")} size="sm" asChild>
          <Link href="/admin26081993/music-stats" prefetch={false}>
            <LineChart className="mr-1 h-4 w-4" />
            Статистика
          </Link>
        </Button>
        <Button variant={navVariant(active === "music-track-map")} size="sm" asChild>
          <Link href="/admin26081993/music-track-map" prefetch={false}>
            <Database className="mr-1 h-4 w-4" />
            Маппинг треков stats
          </Link>
        </Button>
        <Button variant={navVariant(active === "publicka")} size="sm" asChild>
          <Link href="/admin26081993/publicka" prefetch={false}>
            <Building2 className="mr-1 h-4 w-4" />
            Публичка
          </Link>
        </Button>
        <Button variant={navVariant(active === "video-clips")} size="sm" asChild>
          <Link href="/admin26081993/video-clips" prefetch={false}>
            <Film className="mr-1 h-4 w-4" />
            Видеоклипы
          </Link>
        </Button>
        <Button variant={navVariant(active === "withdrawals")} size="sm" asChild>
          <Link href="/admin26081993/withdrawals" prefetch={false}>
            <Wallet className="mr-1 h-4 w-4" />
            Заявки на вывод
          </Link>
        </Button>
        <Button variant={navVariant(active === "service-fulfillments")} size="sm" asChild>
          <Link href="/admin26081993/service-fulfillments" prefetch={false}>
            <ClipboardList className="mr-1 h-4 w-4" />
            Заказы услуг
          </Link>
        </Button>
        <Button variant={navVariant(active === "reviews")} size="sm" asChild>
          <Link href="/admin26081993/reviews" prefetch={false}>
            <MessageSquare className="mr-1 h-4 w-4" />
            Отзывы
          </Link>
        </Button>
        <Button variant={navVariant(active === "support")} size="sm" asChild>
          <Link href="/admin26081993/support" prefetch={false}>
            <Headset className="mr-1 h-4 w-4" />
            Поддержка
          </Link>
        </Button>
        <Button variant={navVariant(active === "legal-acceptance")} size="sm" asChild>
          <Link href="/admin26081993/legal-acceptance" prefetch={false}>
            <Scale className="mr-1 h-4 w-4" />
            Акцепты оферты
          </Link>
        </Button>
      </div>
    </div>
  )
}
