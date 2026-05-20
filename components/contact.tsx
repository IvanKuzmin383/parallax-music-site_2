"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n-context"
import { Turnstile } from "@marsidev/react-turnstile"
import { getTurnstileSiteKeyClient, isTurnstileEnabledClient } from "@/lib/turnstile-config"

type ContactFormValues = {
  name: string
  email: string
  projectType: string
  message: string
  consent: boolean
}

export function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [showCaptcha, setShowCaptcha] = useState(false)
  const captchaMountRef = useRef<HTMLDivElement>(null)
  const { t, locale } = useI18n()
  const turnstileEnabled = isTurnstileEnabledClient()
  const turnstileSiteKey = getTurnstileSiteKeyClient()

  useEffect(() => {
    if (!turnstileEnabled || !turnstileSiteKey) return
    const el = captchaMountRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowCaptcha(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [turnstileEnabled, turnstileSiteKey])

  const contactFormSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(2, t.validation.nameMin)
          .max(100, t.validation.nameMax),
        email: z.string().email(t.validation.emailInvalid),
        projectType: z
          .string()
          .min(2, t.validation.projectTypeMin)
          .max(100, t.validation.projectTypeMax),
        message: z
          .string()
          .min(10, t.validation.messageMin)
          .max(1000, t.validation.messageMax),
        consent: z.literal(true, {
          errorMap: () => ({
            message: "Необходимо дать согласие на обработку персональных данных",
          }),
        }),
      }),
    [t]
  )

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      projectType: "",
      message: "",
      consent: false,
    },
  })

  const onSubmit = async (data: ContactFormValues) => {
    if (turnstileEnabled && !captchaToken) {
      toast.error(locale === "ru" ? "Подтвердите, что вы не робот" : "Please confirm you are not a robot")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Locale": locale || "ru",
        },
        body: JSON.stringify({
          ...data,
          captchaToken: turnstileEnabled ? captchaToken : undefined,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success(result.message || t.contact.success)
        form.reset()
        setCaptchaToken(null)
      } else {
        toast.error(result.error || t.contact.error)
      }
    } catch (error) {
      console.error("Contact form error:", error)
      toast.error(t.contact.errorGeneric)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section id="contact" className="py-24 bg-card">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="text-foreground">{t.contact.title}</span>{" "}
              <span className="text-primary">{t.contact.titleHighlight}</span>
            </h2>
            <p className="text-lg text-muted-foreground text-pretty">
              {t.contact.description}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t.contact.form.name}{" "}
                        <span className="text-destructive" aria-label={t.contact.form.required}>
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t.contact.form.name}
                          className="bg-background border-border"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t.contact.form.email}{" "}
                        <span className="text-destructive" aria-label={t.contact.form.required}>
                          *
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t.contact.form.email}
                          className="bg-background border-border"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t.contact.form.projectType}{" "}
                      <span className="text-destructive" aria-label={t.contact.form.required}>
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t.contact.form.projectTypePlaceholder}
                        className="bg-background border-border"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t.contact.form.message}{" "}
                      <span className="text-destructive" aria-label={t.contact.form.required}>
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t.contact.form.messagePlaceholder}
                        className="bg-background border-border min-h-[150px]"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="consent"
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none text-sm text-muted-foreground text-left">
                      <FormLabel className="font-normal">
                        Я даю согласие на обработку моих персональных данных в соответствии с{" "}
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline"
                        >
                          Политикой конфиденциальности
                        </a>{" "}
                        и{" "}
                        <a
                          href="/terms-of-use"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:no-underline"
                        >
                          Условиями использования сайта
                        </a>
                        .
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
              {turnstileEnabled && turnstileSiteKey ? (
                <div ref={captchaMountRef} className="flex justify-center min-h-[65px]">
                  {showCaptcha ? (
                    <Turnstile
                      siteKey={turnstileSiteKey}
                      onSuccess={(token) => setCaptchaToken(token)}
                      onError={() => setCaptchaToken(null)}
                      onExpire={() => setCaptchaToken(null)}
                      options={{
                        theme: "dark",
                      }}
                    />
                  ) : null}
                </div>
              ) : null}
              <div className="flex flex-col items-center justify-center gap-4 text-center md:flex-row md:gap-6">
                <Button
                  type="submit"
                  size="lg"
                  className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-12"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t.contact.form.sending : t.contact.form.sendMessage}
                </Button>

                <span className="text-sm text-muted-foreground">
                  {locale === "ru" ? "или" : "or"}
                </span>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="px-6"
                  >
                    <a
                      href="https://t.me/parallaxmusic_rt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      <span>{locale === "ru" ? "Написать" : "Message"}</span>
                      <svg
                        width={20}
                        height={20}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M22 2L11 13" />
                        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                      </svg>
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="px-6"
                  >
                    <a
                      href="https://vk.com/parallaxmusic_releaseteam"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2"
                    >
                      <span>VK</span>
                      <svg
                        width={20}
                        height={20}
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden
                      >
                        <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.847 2.462 2.253 4.624 2.836 4.624.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.154-3.574 2.154-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.203.339-.271.508 0 .847.203.271.847 1.017 1.287 1.677.847 1.186 1.49 2.186 1.662 2.677.17.491-.085.744-.576.744z" />
                      </svg>
                    </a>
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </section>
  )
}
