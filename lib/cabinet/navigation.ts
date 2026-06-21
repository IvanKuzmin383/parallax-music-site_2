import type { LucideIcon } from "lucide-react"
import {
  Home,
  Music,
  TrendingUp,
  Palette,
  Sparkles,
  Shield,
  ClipboardList,
  Wallet,
  Users,
  LifeBuoy,
  Settings,
  Disc3,
  ListMusic,
  BarChart3,
  Megaphone,
  Image,
  Video,
  Film,
  UserCircle,
  Upload,
  Wand2,
  FileText,
  Mic2,
  Radio,
  Building2,
  Lock,
  FolderOpen,
} from "lucide-react"

export interface NavItem {
  id: string
  label: string
  href: string
  icon: LucideIcon
}

export interface NavGroup {
  id: string
  label: string
  icon: LucideIcon
  items: NavItem[]
}

export const CABINET_MAIN_NAV: NavItem[] = [
  { id: "home", label: "Главная", href: "/cabinet", icon: Home },
]

export const CABINET_NAV_GROUPS: NavGroup[] = [
  {
    id: "music",
    label: "Музыка",
    icon: Music,
    items: [
      { id: "distribution", label: "Дистрибуция", href: "/cabinet/music/distribution", icon: Disc3 },
      { id: "releases", label: "Мои релизы", href: "/cabinet/music/releases", icon: ListMusic },
      { id: "royalties", label: "Роялти", href: "/cabinet/music/royalties", icon: BarChart3 },
    ],
  },
  {
    id: "promotion",
    label: "Продвижение",
    icon: TrendingUp,
    items: [
      { id: "vk", label: "VK Реклама", href: "/cabinet/promotion/vk", icon: Megaphone },
      { id: "yandex", label: "Яндекс Реклама", href: "/cabinet/promotion/yandex", icon: Megaphone },
      { id: "playlists", label: "Плейлисты Яндекс Музыки", href: "/cabinet/promotion/playlists", icon: ListMusic },
      { id: "tiktok", label: "TikTok / Блогеры", href: "/cabinet/promotion/tiktok", icon: Video },
      { id: "radio", label: "Радио", href: "/cabinet/promotion/radio", icon: Radio },
      { id: "business", label: "Музыка для бизнеса", href: "/cabinet/promotion/business-music", icon: Building2 },
    ],
  },
  {
    id: "design",
    label: "Оформление",
    icon: Palette,
    items: [
      { id: "covers", label: "AI Обложки", href: "/cabinet/design/covers", icon: Image },
      { id: "vertical-videos", label: "Вертикальные видео", href: "/cabinet/design/vertical-videos", icon: Video },
      { id: "video-shots", label: "Видеошоты", href: "/cabinet/design/video-shots", icon: Film },
      { id: "video-avatar", label: "Видео-аватар", href: "/cabinet/design/video-avatar", icon: UserCircle },
      { id: "video-shots-publishing", label: "Публикация видеошотов", href: "/cabinet/design/video-shots-publishing", icon: Upload },
      { id: "mastering", label: "AI Мастеринг", href: "/cabinet/design/mastering", icon: Wand2 },
    ],
  },
  {
    id: "ai",
    label: "AI Инструменты",
    icon: Sparkles,
    items: [
      { id: "tracks", label: "Создание треков", href: "/cabinet/ai/tracks", icon: Music },
      { id: "pitch", label: "Питч для редакторов", href: "/cabinet/ai/pitch", icon: Mic2 },
      { id: "press-release", label: "Пресс-релиз", href: "/cabinet/ai/press-release", icon: FileText },
    ],
  },
  {
    id: "protect",
    label: "Защита",
    icon: Shield,
    items: [
      { id: "deposit", label: "Депонирование", href: "/cabinet/protect/deposit", icon: Lock },
      { id: "my-deposits", label: "Мои депозиты", href: "/cabinet/protect/my-deposits", icon: FolderOpen },
    ],
  },
]

export const CABINET_BOTTOM_NAV: NavItem[] = [
  { id: "orders", label: "Заказы", href: "/cabinet/orders", icon: ClipboardList },
  {
    id: "finance",
    label: "Финансы",
    href: "/cabinet/finance/balance",
    icon: Wallet,
  },
  { id: "referrals", label: "Партнерка", href: "/cabinet/referrals", icon: Users },
  { id: "support", label: "Поддержка", href: "/cabinet/support", icon: LifeBuoy },
  { id: "settings", label: "Настройки", href: "/cabinet/settings", icon: Settings },
]

export const FINANCE_SUB_NAV: NavItem[] = [
  { id: "balance", label: "Баланс", href: "/cabinet/finance/balance", icon: Wallet },
  { id: "transactions", label: "История операций", href: "/cabinet/finance/transactions", icon: ClipboardList },
  { id: "royalty-withdrawal", label: "Вывод роялти", href: "/cabinet/finance/royalty-withdrawal", icon: TrendingUp },
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
