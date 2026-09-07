"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Rocket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CabinetPromoteSection } from "@/components/cabinet-promote-section"
import { useI18n } from "@/lib/i18n-context"

export default function CabinetPromotePage() {
  const router = useRouter()
  const { t } = useI18n()
  const promote = t.cabinet.promote

  useEffect(() => {
    fetch("/api/cabinet/tracks", { credentials: "include" }).then((res) => {
      if (res.status === 401) {
        router.replace("/cabinet")
      }
    })
  }, [router])

  return (
    <div className="min-h-screen bg-background p-4 pt-20">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cabinet">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Rocket className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{promote.title}</h1>
          </div>
        </div>

        <p className="text-muted-foreground">{promote.description}</p>

        <CabinetPromoteSection showHeader={false} />

        <div className="flex justify-end">
          <Button variant="outline" asChild>
            <Link href="/cabinet">{promote.backToCabinet}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
