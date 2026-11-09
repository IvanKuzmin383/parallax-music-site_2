"use client"

import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { SlowedReverbEditor } from "@/components/tools/slowed-reverb-editor"

function ToolsSlowedReverbInner() {
  return (
    <div className="flex w-full min-w-0 max-w-none flex-col gap-6">
      <div className="space-y-3">
        <Link
          href="/cabinet/tools"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          К инструментам
        </Link>
        <PageHeader
          title="Slowed / Reverb / Nightcore"
          className="[&_p]:max-w-none"
          description="Бесплатно в браузере: скорость, басы и реверб. Файл не сохраняется на сервере - только скачивание."
        />
      </div>

      <SlowedReverbEditor source="cabinet" />
    </div>
  )
}

export function ToolsSlowedReverbClient() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      }
    >
      <ToolsSlowedReverbInner />
    </Suspense>
  )
}
