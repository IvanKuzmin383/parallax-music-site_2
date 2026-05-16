import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "AI мастеринг",
  description:
    "AI мастеринг — автоматическая обработка музыки нейросетью с профессиональным качеством для стриминговых сервисов",
  openGraph: {
    title: "AI мастеринг | Parallax Music",
    description:
      "AI мастеринг — автоматическая обработка музыки нейросетью с профессиональным качеством для стриминговых сервисов",
  },
}

export default function AiMasteringLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

