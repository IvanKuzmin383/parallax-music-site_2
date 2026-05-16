"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  FileText,
  LineChart,
  LogOut,
  Megaphone,
  MessageSquare,
  Music,
  ClipboardList,
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
  | "legal-acceptance"

interface AdminSectionNavProps {
  active: AdminSectionNavActive
}

function navVariant(isActive: boolean): "secondary" | "ghost" {
  return isActive ? "secondary" : "ghost"
}

export function AdminSectionNav({ active }: AdminSectionNavProps) {
  const router = useRouter()

  return (
    <div className="flex justify-between items-center flex-wrap gap-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant={navVariant(active === "articles")} size="sm" asChild>
          <Link href="/admin26081993">
            <FileText className="h-4 w-4 mr-1" />
            Статьи
          </Link>
        </Button>
        <Button variant={navVariant(active === "cabinet-users")} size="sm" asChild>
          <Link href="/admin26081993/cabinet-users">
            <Users className="h-4 w-4 mr-1" />
            Пользователи ЛК
          </Link>
        </Button>
        <Button variant={navVariant(active === "cabinet-announcements")} size="sm" asChild>
          <Link href="/admin26081993/cabinet-announcements">
            <Megaphone className="h-4 w-4 mr-1" />
            Новости ЛК
          </Link>
        </Button>
        <Button variant={navVariant(active === "tracks")} size="sm" asChild>
          <Link href="/admin26081993/tracks">
            <Music className="h-4 w-4 mr-1" />
            Треки
          </Link>
        </Button>
        <Button variant={navVariant(active === "reports")} size="sm" asChild>
          <Link href="/admin26081993/reports">
            <BarChart3 className="h-4 w-4 mr-1" />
            Отчеты
          </Link>
        </Button>
        <Button variant={navVariant(active === "music-stats")} size="sm" asChild>
          <Link href="/admin26081993/music-stats">
            <LineChart className="h-4 w-4 mr-1" />
            Статистика
          </Link>
        </Button>
        <Button variant={navVariant(active === "withdrawals")} size="sm" asChild>
          <Link href="/admin26081993/withdrawals">
            <Wallet className="h-4 w-4 mr-1" />
            Заявки на вывод
          </Link>
        </Button>
        <Button variant={navVariant(active === "service-fulfillments")} size="sm" asChild>
          <Link href="/admin26081993/service-fulfillments">
            <ClipboardList className="h-4 w-4 mr-1" />
            Заказы услуг
          </Link>
        </Button>
        <Button variant={navVariant(active === "reviews")} size="sm" asChild>
          <Link href="/admin26081993/reviews">
            <MessageSquare className="h-4 w-4 mr-1" />
            Отзывы
          </Link>
        </Button>
        <Button variant={navVariant(active === "legal-acceptance")} size="sm" asChild>
          <Link href="/admin26081993/legal-acceptance">
            <Scale className="h-4 w-4 mr-1" />
            Акцепты оферты
          </Link>
        </Button>
      </div>
      <Button variant="outline" onClick={() => router.push("/admin26081993")}>
        <LogOut className="h-4 w-4 mr-2" />
        На главную админки
      </Button>
    </div>
  )
}
