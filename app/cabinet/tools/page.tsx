"use client"

import { PageHeader } from "@/components/cabinet/shared/page-header"
import { ToolsCatalog } from "@/components/cabinet/tools/tools-catalog"

export default function CabinetToolsPage() {
  return (
    <div className="w-full max-w-none space-y-10">
      <PageHeader title="Инструменты" />
      <ToolsCatalog />
    </div>
  )
}
