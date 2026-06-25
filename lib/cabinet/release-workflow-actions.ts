import type { LucideIcon } from "lucide-react"
import {
  Building2,
  Image,
  ListMusic,
  Megaphone,
  Radio,
  Shield,
  Sparkles,
  Video,
  Wand2,
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
    id: "ai-cover",
    label: "AI-обложка",
    description: "Новый визуал для релиза",
    href: "/cabinet/design/covers",
    icon: Image,
    accent: "violet",
  },
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
    label: "Запустить рекламу",
    description: "VK и таргет",
    href: "/cabinet/promotion/vk",
    icon: Megaphone,
    accent: "primary",
  },
  {
    id: "playlists",
    label: "Плейлисты",
    description: "Подача в редакторские",
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
    description: "Коммерческое использование",
    href: "/cabinet/promotion/business-music",
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
  {
    id: "ai-mastering",
    label: "AI-мастеринг",
    description: "Финальная обработка",
    href: "/cabinet/design/mastering",
    icon: Wand2,
    accent: "violet",
  },
  {
    id: "ai-track",
    label: "Создать AI-трек",
    description: "Генерация идей",
    href: "/cabinet/ai/tracks",
    icon: Sparkles,
    accent: "primary",
  },
]
