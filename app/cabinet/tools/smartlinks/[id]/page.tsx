"use client"

import { use } from "react"
import { ToolsSmartlinkEditorClient } from "@/components/cabinet/tools/tools-smartlink-editor-client"

export default function CabinetToolsSmartlinkEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <ToolsSmartlinkEditorClient smartlinkId={id} />
}
