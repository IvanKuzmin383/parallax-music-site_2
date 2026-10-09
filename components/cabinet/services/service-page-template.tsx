"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ComingSoonButton } from "@/components/cabinet/shared/coming-soon-button"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import { getCabinetServiceHubHref } from "@/lib/cabinet/service-back"
import type { ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"
import Link from "next/link"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

interface ServicePageTemplateProps {
  service: ServiceCatalogEntry
}

function ServicePageTemplateInner({ service }: ServicePageTemplateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const backHref = getCabinetServiceHubHref(pathname)
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
    toast.error("Оформление этой услуги пока недоступно")
  }

  const handleCardPay = async () => {
    const isStub = Boolean(service.paymentStub && service.paymentEndpoint)
    const isLivePay = Boolean(service.hasBackend && service.paymentEndpoint && !service.paymentStub)

    if (!isStub && !isLivePay) {
      handleMockOrder()
      return
    }
    if (!projectName.trim()) {
      toast.error("Укажите название релиза или проекта")
      return
    }
    if (service.linkFieldRequired && !trackLink.trim()) {
      toast.error(`Укажите: ${service.linkFieldLabel || "ссылку"}`)
      return
    }
    if (isLivePay && (!comment.trim() || comment.trim().length < 2)) {
      toast.error("Заполните комментарий к заказу")
      return
    }

    setSubmitting(true)
    try {
      const link = trackLink.trim()
      const res = await fetch(service.paymentEndpoint!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trackTitle: projectName.trim(),
          trackLink: link || undefined,
          fileUrl: link || undefined,
          comment: comment.trim(),
          contactType: "telegram",
          contactValue: "@artist",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || (isStub ? "Не удалось отправить заявку" : "Не удалось создать оплату"))
        return
      }
      if (isStub || data.stub === true) {
        toast.success(
          typeof data.message === "string" && data.message
            ? data.message
            : "Услуга скоро появится. Деньги не списаны - мы свяжемся с вами."
        )
        setProjectName("")
        setTrackLink("")
        setComment("")
        return
      }
      const payUrl =
        (typeof data.paymentUrl === "string" && data.paymentUrl) ||
        (typeof data.confirmationUrl === "string" && data.confirmationUrl) ||
        ""
      if (payUrl) {
        window.location.href = payUrl
        return
      }
      toast.error("Не удалось создать оплату")
    } catch {
      toast.error(isStub ? "Ошибка при отправке заявки" : "Ошибка при создании оплаты")
    } finally {
      setSubmitting(false)
    }
  }

  const orderForm = (
    <Card id="order-form" className="w-full min-w-0 border-primary/20">
      <CardHeader>
        <CardTitle>Заявка на услугу</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="project">Название релиза / проекта</Label>
          <Input id="project" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Мой сингл" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="link">
            {service.linkFieldLabel || "Ссылка на трек"}
            {service.linkFieldRequired ? " *" : ""}
          </Label>
          <Input
            id="link"
            value={trackLink}
            onChange={(e) => setTrackLink(e.target.value)}
            placeholder={service.linkFieldPlaceholder || "https://..."}
          />
          {service.linkFieldHint ? (
            <p className="text-xs text-muted-foreground">{service.linkFieldHint}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="comment">Комментарий</Label>
          <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Пожелания к заказу" rows={4} />
        </div>
        <div className="rounded-md border border-border p-4 space-y-3">
          <p className="font-semibold">Итого: {service.priceLabel}</p>
          {service.paymentStub ? (
            <p className="text-sm text-muted-foreground">
              Оплата пока не списывается - заявка нужна, чтобы оценить спрос. Мы свяжемся с вами.
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            <Button onClick={() => void handleCardPay()} disabled={submitting} className="w-full">
              {submitting
                ? service.paymentStub
                  ? "Отправка..."
                  : "Создание..."
                : service.paymentStub
                  ? "Оплатить"
                  : "Оплатить картой"}
            </Button>
            {!service.paymentStub ? (
              <ComingSoonButton tooltip="Оплата с баланса будет доступна позже" className="w-full">
                Оплатить с баланса
              </ComingSoonButton>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="w-full min-w-0 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
            <Link href={backHref} aria-label="Назад">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{service.title}</h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl">{service.shortDescription}</p>
          </div>
        </div>
        <Button type="button" variant="outline" className="shrink-0 self-start" onClick={() => openCabinetSupportChat()}>
          Задать вопрос
        </Button>
      </div>

      <Card className="w-full min-w-0 border-primary/20">
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

      <div className="grid w-full min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:items-start xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
        <div className="min-w-0 space-y-8">
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
            <ol className="space-y-2 text-sm text-muted-foreground">
              {service.steps.map((step, i) => (
                <li key={step} className="flex gap-2 text-foreground">
                  <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                  <span>{step}</span>
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
        </div>

        <aside className="min-w-0 lg:sticky lg:top-4">{orderForm}</aside>
      </div>
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
