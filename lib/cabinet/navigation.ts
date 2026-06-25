import type { LucideIcon } from "lucide-react"
import {
  ClipboardList,
  Disc3,
  Home,
  LifeBuoy,
  Settings,
  Users,
  Wallet,
} from "lucide-react"

export interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
}

/** Короткое меню кабинета — вокруг артиста, не каталог услуг. */
export const CABINET_SIDEBAR_NAV: NavItem[] = [
  { id: "home", label: "Главная", href: "/cabinet", icon: Home },
  { id: "releases", label: "Релизы", href: "/cabinet/music/releases", icon: Disc3 },
  { id: "orders", label: "Заказы", href: "/cabinet/orders", icon: ClipboardList },
  { id: "finance", label: "Финансы", href: "/cabinet/finance/balance", icon: Wallet },
  { id: "referrals", label: "Партнёрка", href: "/cabinet/referrals", icon: Users },
  { id: "support", label: "Поддержка", href: "/cabinet/support", icon: LifeBuoy },
  { id: "settings", label: "Настройки", href: "/cabinet/settings", icon: Settings },
]

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
