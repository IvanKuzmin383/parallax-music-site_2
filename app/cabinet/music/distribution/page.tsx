"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { CheckCircle2 } from "lucide-react"

export default function MusicDistributionPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Дистрибуция"
        description="Загрузка и доставка релиза на музыкальные площадки."
      />

      <Card>
        <CardContent className="pt-6 space-y-4">
          <ul className="space-y-2 text-sm">
            {["Яндекс Музыка, Spotify, VK и другие площадки", "Модерация и сопровождение релиза", "Смартлинк после публикации"].map((item) => (
              <li key={item} className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild>
              <Link href="/cabinet/upload">Загрузить релиз</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/cabinet/publishing-rules">Правила публикации</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
