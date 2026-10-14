"use client"

import { use } from "react"
import { SmartlinkEditor } from "@/components/cabinet/smartlink/smartlink-editor"

export default function ReleaseSmartlinkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <SmartlinkEditor releaseKey={id} />
}
