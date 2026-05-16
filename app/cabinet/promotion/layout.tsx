import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Услуги",
  description: "Дополнительные инструменты для эффективного продвижения вашей музыки",
  openGraph: {
    title: "Услуги | Parallax Music",
    description: "Дополнительные инструменты для эффективного продвижения вашей музыки",
  },
}

export default function PromotionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
