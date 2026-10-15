"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { openCabinetSupportChat } from "@/components/cabinet/support/cabinet-support-chat"
import { getCabinetServiceHubHref } from "@/lib/cabinet/service-back"
import type { ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"
import { ServicePriceText } from "@/components/cabinet/shared/service-price-text"
import { PLATFORM_ICON_SRC } from "@/lib/smartlink-platforms"
import Link from "next/link"
import Image from "next/image"
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
  const [releaseDate, setReleaseDate] = useState("")
  const [previewTimecodeSec, setPreviewTimecodeSec] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const isMusicVideo = service.orderType === "music_video" || service.slug === "music-video"

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

  const handlePay = async () => {
    const isStub = Boolean(service.paymentStub && service.paymentEndpoint)
    const isLivePay = Boolean(service.hasBackend && service.paymentEndpoint && !service.paymentStub)
    const interestOnly = Boolean(service.interestOnly)

    if (!isStub && !isLivePay) {
      handleMockOrder()
      return
    }
    if (!interestOnly && !projectName.trim()) {
      toast.error("Укажите название релиза или проекта")
      return
    }
    if (!interestOnly && service.linkFieldRequired && !trackLink.trim()) {
      toast.error(`Укажите: ${service.linkFieldLabel || "ссылку"}`)
      return
    }
    if (!interestOnly && isLivePay && (!comment.trim() || comment.trim().length < 2)) {
      toast.error("Заполните комментарий к заказу")
      return
    }
    if (!interestOnly && isMusicVideo && !releaseDate.trim()) {
      toast.error("Укажите дату публикации")
      return
    }
    if (!interestOnly && isMusicVideo) {
      const preview = Number(previewTimecodeSec.trim())
      if (!Number.isFinite(preview) || preview < 0) {
        toast.error("Укажите таймкод превью в секундах")
        return
      }
    }

    setSubmitting(true)
    try {
      const link = trackLink.trim()
      const res = await fetch(service.paymentEndpoint!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          interestOnly
            ? {}
            : {
                trackTitle: projectName.trim(),
                trackLink: link || undefined,
                fileUrl: link || undefined,
                comment: comment.trim(),
                ...(isMusicVideo
                  ? {
                      releaseDate: releaseDate.trim(),
                      previewTimecodeSec: Number(previewTimecodeSec.trim()),
                    }
                  : {}),
                contactType: "telegram",
                contactValue: "@artist",
                payFromBalance: true,
              }
        ),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(
          data.error ||
            (isStub ? "Не удалось отправить заявку" : "Не удалось оплатить с баланса")
        )
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
        setReleaseDate("")
        setPreviewTimecodeSec("")
        return
      }
      if (data.paid === true) {
        toast.success("Оплата с баланса прошла успешно. Заказ принят в работу.")
        setProjectName("")
        setTrackLink("")
        setComment("")
        setReleaseDate("")
        setPreviewTimecodeSec("")
        router.refresh()
        return
      }
      toast.error("Не удалось оплатить с баланса")
    } catch {
      toast.error(isStub ? "Ошибка при отправке заявки" : "Ошибка при оплате с баланса")
    } finally {
      setSubmitting(false)
    }
  }

  const interestCta = service.interestCtaLabel || "Оставить заявку"

  const orderForm = service.interestOnly ? (
    <div id="order-form" className="w-full min-w-0 space-y-3 bg-transparent">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold leading-none">Скоро в кабинете</h2>
          {service.comingSoon ? (
            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
              Скоро
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Оставьте интерес - мы напишем, когда депонирование станет доступно. Оплата сейчас не
          списывается.
        </p>
      </div>
      <div className="space-y-2.5">
        <p className="text-sm font-medium">
          Стоимость:{" "}
          <span className="text-primary">
            {service.priceKey ? (
              <>
                {service.pricePrefix ? <span>{service.pricePrefix}</span> : null}
                <ServicePriceText priceKey={service.priceKey} fallback={service.priceLabel} />
              </>
            ) : (
              service.priceLabel
            )}
          </span>
        </p>
        <Button onClick={() => void handlePay()} disabled={Boolean(submitting)} className="w-full">
          {submitting ? "Отправка..." : interestCta}
        </Button>
      </div>
    </div>
  ) : (
    <div id="order-form" className="w-full min-w-0 space-y-3 bg-transparent">
      <h2 className="text-lg font-semibold leading-none">Заявка на услугу</h2>
      <div className="space-y-2.5">
        <div className="space-y-1.5">
          <Label htmlFor="project">Название релиза / проекта</Label>
          <Input
            id="project"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Мой сингл"
          />
        </div>
        <div className="space-y-1.5">
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
        {isMusicVideo ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="release-date">Дата публикации *</Label>
              <Input
                id="release-date"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="preview-timecode">Таймкод превью (сек) *</Label>
              <Input
                id="preview-timecode"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={previewTimecodeSec}
                onChange={(e) => setPreviewTimecodeSec(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Секунда, с которой начинается превью клипа на площадках
              </p>
            </div>
          </>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="comment">Комментарий</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Пожелания к заказу"
            rows={3}
          />
        </div>
        <div className="space-y-2 pt-1">
          <p className="font-semibold">
            Итого:{" "}
            {service.priceKey ? (
              <>
                {service.pricePrefix ? <span>{service.pricePrefix}</span> : null}
                <ServicePriceText priceKey={service.priceKey} fallback={service.priceLabel} />
              </>
            ) : (
              service.priceLabel
            )}
          </p>
          {service.paymentStub ? (
            <p className="text-sm text-muted-foreground">
              Оплата пока не списывается - заявка нужна, чтобы оценить спрос. Мы свяжемся с вами.
            </p>
          ) : null}
          <Button onClick={() => void handlePay()} disabled={submitting} className="w-full">
            {submitting
              ? service.paymentStub
                ? "Отправка..."
                : "Оплата..."
              : service.paymentStub
                ? "Оплатить"
                : "Оплатить с баланса"}
          </Button>
        </div>
      </div>
    </div>
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
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{service.title}</h1>
              {service.comingSoon ? (
                <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                  Скоро
                </span>
              ) : null}
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground md:text-base">
              {service.shortDescription}
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" className="shrink-0 self-start" onClick={() => openCabinetSupportChat()}>
          Задать вопрос
        </Button>
      </div>

      <Card className="w-full min-w-0 gap-0 border-primary/20 py-0">
        <CardContent className="px-4 py-3">
          <div className="min-w-0">
            <p className="text-xl font-bold leading-none text-primary sm:text-2xl">
              {service.priceKey ? (
                <>
                  {service.pricePrefix ? <span>{service.pricePrefix}</span> : null}
                  <ServicePriceText priceKey={service.priceKey} fallback={service.priceLabel} />
                </>
              ) : (
                service.priceLabel
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Стоимость услуги</p>
          </div>
        </CardContent>
      </Card>

      {service.layout === "form-focus" ? (
        <div className="grid w-full min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(14rem,0.55fr)] lg:items-start xl:gap-10">
          <div className="w-full min-w-0">{orderForm}</div>

          <div className="min-w-0 space-y-8 lg:sticky lg:top-4">
            {service.examples && service.examples.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Примеры видеоклипов</h2>
                <ul className="flex flex-row flex-wrap gap-2">
                  {service.examples.map((ex) => (
                    <li key={ex.href}>
                      <a
                        href={ex.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Смотреть: ${ex.title}`}
                        title={ex.title}
                        className="inline-flex items-center gap-2 text-sm text-foreground transition-opacity hover:opacity-80"
                      >
                        <Image
                          src={PLATFORM_ICON_SRC[ex.platform]}
                          alt=""
                          width={22}
                          height={22}
                          className="h-[22px] w-[22px] shrink-0 object-contain"
                          unoptimized
                        />
                        Смотреть
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

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
        </div>
      ) : (
        <div className="grid w-full min-w-0 grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
          <div className="min-w-0 space-y-8">
            {service.features.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Что входит</h2>
                <ul className="space-y-2">
                  {service.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {service.steps.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Как это работает</h2>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  {service.steps.map((step, i) => (
                    <li key={step} className="flex gap-2 text-foreground">
                      <span className="shrink-0 text-muted-foreground">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {service.requirements.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-lg font-semibold">Что нужно от артиста</h2>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  {service.requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </section>
            ) : null}

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
      )}
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
