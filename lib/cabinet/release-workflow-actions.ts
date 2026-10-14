import type { LucideIcon } from "lucide-react"
import {
  Building2,
  ListMusic,
  Megaphone,
  Radio,
  Shield,
  Video,
} from "lucide-react"

export type ReleaseWorkflowAction = {
  id: string
  label: string
  description: string
  href: string
  icon: LucideIcon
  accent: "primary" | "violet" | "blue" | "amber" | "emerald"
}

export const RELEASE_WORKFLOW_ACTIONS: ReleaseWorkflowAction[] = [
  {
    id: "vertical-video",
    label: "Вертикальное видео",
    description: "Клип для соцсетей",
    href: "/cabinet/design/vertical-videos",
    icon: Video,
    accent: "blue",
  },
  {
    id: "vk-ads",
    label: "Продвижение в VK Музыка",
    description: "Больше слушателей. Больше охват. Больше результата.",
    href: "/cabinet/promotion/vk",
    icon: Megaphone,
    accent: "primary",
  },
  {
    id: "playlists",
    label: "Плейлисты Яндекс Музыки",
    description: "Самый быстрый способ начать продвижение нового релиза",
    href: "/cabinet/promotion/playlists",
    icon: ListMusic,
    accent: "emerald",
  },
  {
    id: "radio",
    label: "Радио",
    description: "Ротация на станциях",
    href: "/cabinet/promotion/radio",
    icon: Radio,
    accent: "amber",
  },
  {
    id: "business",
    label: "Музыка для бизнеса",
    description: "Фоновая музыка БизнесЗвук",
    href: "/cabinet/publicka",
    icon: Building2,
    accent: "blue",
  },
  {
    id: "deposit",
    label: "Депонирование",
    description: "Защита авторства",
    href: "/cabinet/protect/deposit",
    icon: Shield,
    accent: "emerald",
  },
]
