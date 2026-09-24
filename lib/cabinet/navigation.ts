import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  ClipboardList,
  Disc3,
  Home,
  Megaphone,
  Settings,
  Users,
  Wallet,
  Wrench,
} from "lucide-react"

export interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
}

export interface NavGroup {
  id: string
  /** null — группа без заголовка */
  label: string | null
  items: NavItem[]
}

/**
 * Меню кабинета:
 * (без заголовка) Главная · Релизы · Статистика
 * Услуги — Продвижение · Инструменты · Заказы
 * Кабинет — Финансы · Партнёрка · Настройки
 */
export const CABINET_SIDEBAR_GROUPS: NavGroup[] = [
  {
    id: "main",
    label: null,
    items: [
      { id: "home", label: "Главная", href: "/cabinet", icon: Home },
      { id: "releases", label: "Релизы", href: "/cabinet/music/releases", icon: Disc3 },
      { id: "stats", label: "Статистика", href: "/cabinet/music-stats", icon: BarChart3 },
    ],
  },
  {
    id: "services",
    label: "Услуги",
    items: [
      { id: "promotion", label: "Продвижение", href: "/cabinet/promotion", icon: Megaphone },
      { id: "tools", label: "Инструменты", href: "/cabinet/tools", icon: Wrench },
      { id: "orders", label: "Заказы", href: "/cabinet/orders", icon: ClipboardList },
    ],
  },
  {
    id: "cabinet",
    label: "Кабинет",
    items: [
      { id: "finance", label: "Финансы", href: "/cabinet/finance/balance", icon: Wallet },
      { id: "referrals", label: "Партнёрка", href: "/cabinet/referrals", icon: Users },
      { id: "settings", label: "Настройки", href: "/cabinet/settings", icon: Settings },
    ],
  },
]

/** Плоский список (обратная совместимость). */
export const CABINET_SIDEBAR_NAV: NavItem[] = CABINET_SIDEBAR_GROUPS.flatMap((g) => g.items)

export const FINANCE_SUB_NAV: NavItem[] = [
  { id: "balance", label: "Баланс", href: "/cabinet/finance/balance", icon: Wallet },
  { id: "transactions", label: "История операций", href: "/cabinet/finance/transactions", icon: ClipboardList },
  { id: "royalty-withdrawal", label: "Вывод роялти", href: "/cabinet/finance/royalty-withdrawal", icon: Wallet },
]

/** Пути без sidebar (auth / recovery). */
export const CABINET_AUTH_PATHS = [
  "/cabinet/forgot-password",
  "/cabinet/reset-password",
  "/cabinet/autopay/confirm",
] as const

export function isCabinetAuthPath(pathname: string): boolean {
  return CABINET_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function isCabinetFinancePath(pathname: string): boolean {
  return pathname.startsWith("/cabinet/finance")
}

export function isCabinetPromotionPath(pathname: string): boolean {
  return (
    pathname === "/cabinet/promotion" ||
    pathname.startsWith("/cabinet/promotion/") ||
    pathname === "/cabinet/promote" ||
    pathname.startsWith("/cabinet/promote/")
  )
}

export function isCabinetToolsPath(pathname: string): boolean {
  return (
    pathname === "/cabinet/tools" ||
    pathname.startsWith("/cabinet/tools/") ||
    pathname.startsWith("/cabinet/design/") ||
    pathname.startsWith("/cabinet/ai/") ||
    pathname.startsWith("/cabinet/protect/")
  )
}
