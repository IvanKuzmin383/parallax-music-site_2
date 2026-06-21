"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { ComingSoonButton } from "@/components/cabinet/shared/coming-soon-button"
import type { ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"

interface ServicePageTemplateProps {
  service: ServiceCatalogEntry
}

function ServicePageTemplateInner({ service }: ServicePageTemplateProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentHandledRef = useRef(false)
  const [projectName, setProjectName] = useState("")
  const [trackLink, setTrackLink] = useState("")
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const paymentState = searchParams.get("payment")
    const orderId = searchParams.get("orderId")
    if (paymentState !== "return" || !orderId || paymentHandledRef.current) return
    paymentHandledRef.current = true
    void (async () => {
      try {
        const res = await fetch(`/api/cabinet/payments/order-status?orderId=${encodeURIComponent(orderId)}`, {
          credentials: "include",
        })
        const data = await res.json().catch(() => ({}))
        if (data.status === "paid") {
          toast.success("Оплата прошла успешно. Заказ принят в работу.")
          router.replace(service.href)
        } else if (data.status === "failed") {
          toast.error("Оплата не завершена")
        }
      } catch {
        toast.error("Не удалось проверить статус оплаты")
      }
    })()
  }, [searchParams, router, service.href])

  const handleMockOrder = () => {
    if (!projectName.trim()) {
      toast.error("Укажите название релиза или проекта")
      return
    }
    toast.success("Заявка создана (демо). Заказ появится в разделе «Заказы» после подключения API.")
  }

  const handleCardPay = async () => {
    if (!service.hasBackend || !service.paymentEndpoint) {
      handleMockOrder()
      return
    }
    if (!comment.trim() || comment.trim().length < 2) {
      toast.error("Заполните комментарий к заказу")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(service.paymentEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trackTitle: projectName.trim() || "Без названия",
          comment: comment.trim(),
          contactType: "telegram",
          contactValue: "@artist",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Не удалось создать оплату")
        return
      }
      if (typeof data.paymentUrl === "string" && data.paymentUrl) {
        window.location.href = data.paymentUrl
        return
      }
      toast.error("Не удалось создать оплату")
    } catch {
      toast.error("Ошибка при создании оплаты")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-8">
      <PageHeader title={service.title} description={service.shortDescription}>
        <Button asChild variant="outline">
          <Link href="/cabinet/support">Задать вопрос</Link>
        </Button>
      </PageHeader>

      <Card className="border-primary/20">
        <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-3xl font-bold text-primary">{service.priceLabel}</p>
            <p className="text-muted-foreground text-sm mt-1">Стоимость услуги</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => document.getElementById("order-form")?.scrollIntoView({ behavior: "smooth" })}>
              Заказать
            </Button>
            <Button variant="outline" asChild>
              <Link href="#faq">Подробнее</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Что входит</h2>
        <ul className="space-y-2">
          {service.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Как это работает</h2>
        <ol className="space-y-2 list-decimal list-inside text-sm text-muted-foreground">
          {service.steps.map((step, i) => (
            <li key={step} className="text-foreground">
              <span className="text-muted-foreground mr-2">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Что нужно от артиста</h2>
        <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
          {service.requirements.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      {service.faq.length > 0 ? (
        <section id="faq" className="space-y-3">
          <h2 className="text-lg font-semibold">FAQ</h2>
          <Accordion type="single" collapsible className="w-full">
            {service.faq.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ) : null}

      <Card id="order-form">
        <CardHeader>
          <CardTitle>Форма заказа</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Название релиза / проекта</Label>
            <Input id="project" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Мой сингл" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link">Ссылка на трек</Label>
            <Input id="link" value={trackLink} onChange={(e) => setTrackLink(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Пожелания к заказу" rows={4} />
          </div>
          <div className="rounded-md border border-border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="font-semibold">Итого: {service.priceLabel}</p>
            <div className="flex flex-wrap gap-2">
              <ComingSoonButton tooltip="Оплата с баланса будет доступна позже">Оплатить с баланса</ComingSoonButton>
              <Button onClick={() => void handleCardPay()} disabled={submitting}>
                {submitting ? "Создание..." : "Оплатить картой"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ServicePageTemplate(props: ServicePageTemplateProps) {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20 text-muted-foreground text-sm">Загрузка...</div>
      }
    >
      <ServicePageTemplateInner {...props} />
    </Suspense>
  )
}
