import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Продвижение",
  description: "Инструменты роста аудитории и прослушиваний",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Продвижение | Parallax Music",
    description: "Инструменты роста аудитории и прослушиваний",
  },
}

export default function CabinetPromoteLayout({ children }: { children: React.ReactNode }) {
  return children
}
