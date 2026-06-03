import type { ReactNode } from "react"
import type { Metadata } from "next"
import { buildSmartlinkMetadata } from "@/lib/smartlink-metadata"

export const dynamic = "force-dynamic"

type SmartlinkLayoutProps = {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: SmartlinkLayoutProps): Promise<Metadata> {
  const { slug } = await params
  return buildSmartlinkMetadata(slug)
}

export default function SmartlinkLayout({ children }: { children: ReactNode }) {
  return children
}
