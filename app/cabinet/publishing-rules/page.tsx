"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"

export default function PublishingRulesPage() {
  const router = useRouter()

  useEffect(() => {
    fetch("/api/cabinet/tracks", { credentials: "include" }).then((res) => {
      if (res.status === 401) {
        router.replace("/cabinet")
      }
    })
  }, [router])

  return (
    <div className="min-h-screen bg-background p-4 pt-20">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cabinet">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Правила публикации</h1>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Чек-лист подготовки релиза - Parallax Music</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              Для запуска первого релиза, пожалуйста, подготовьте и направьте:
            </p>

            <div className="space-y-4">
              <section>
                <h2 className="text-lg font-semibold mb-2">1. Аудио</h2>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>WAV-файл трека (16 или 24 bit, 44.1 kHz);</li>
                  <li>финальная версия (без дальнейших правок после отправки).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">2. Обложка</h2>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>3000×3000 px, JPG или PNG;</li>
                  <li>без логотипов стримингов и посторонних надписей;</li>
                  <li>если требуется помощь с оформлением - сообщите отдельно.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">3. Данные по релизу</h2>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>имя артиста (как должно отображаться);</li>
                  <li>название трека;</li>
                  <li>жанр / настроение;</li>
                  <li>язык вокала (если есть).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">4. Авторские данные</h2>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>автор текста;</li>
                  <li>автор музыки;</li>
                  <li>исполнитель;</li>
                  <li>подтверждение, что права на материал принадлежат вам и не нарушают права третьих лиц.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-lg font-semibold mb-2">5. Дата релиза</h2>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>желаемая дата выхода (не ранее чем через 7–10 дней после передачи всех материалов).</li>
                </ul>
              </section>
            </div>

            <div className="pt-4 border-t">
              <p className="font-semibold mb-2">После получения всех пунктов мы:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>- проверяем материалы;</li>
                <li>- согласовываем релизную дату;</li>
                <li>- запускаем подготовку к публикации.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button asChild>
            <Link href="/cabinet">Вернуться в кабинет</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
