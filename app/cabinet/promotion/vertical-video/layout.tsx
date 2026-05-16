import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Вертикальные видео",
  description: "Создание вертикальных видео для продвижения в Tiktok, Reels и Shorts",
  openGraph: {
    title: "Вертикальные видео | Parallax Music",
    description: "Создание вертикальных видео для продвижения в Tiktok, Reels и Shorts",
  },
}

export default function VerticalVideoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
 