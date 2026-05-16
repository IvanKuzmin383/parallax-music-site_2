"use client"

import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useI18n } from "@/lib/i18n-context"
import { Turnstile } from "@marsidev/react-turnstile"
import { getTurnstileSiteKeyClient, isTurnstileEnabledClient } from "@/lib/turnstile-config"

type DemoSubmissionFormValues = {
  artistName: string
  email: string
  trackName: string
  genre: 'Hip-Hop' | 'R&B' | 'Pop' | 'Electronic' | 'Indie Rock' | 'Alternative Rock' | 'Other'
  demoLink: string
  description?: string
  consent: boolean
}

interface DemoSubmissionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const genreKeys = ['Hip-Hop', 'R&B', 'Pop', 'Electronic', 'Indie Rock', 'Alternative Rock', 'Other'] as const

const genreKeyMap = {
  'Hip-Hop': 'hipHop',
  'R&B': 'rnb',
  'Pop': 'pop',
  'Electronic': 'electronic',
  'Indie Rock': 'indieRock',
  'Alternative Rock': 'alternativeRock',
  'Other': 'other',
} as const

export function DemoSubmissionDialog({ open, onOpenChange }: DemoSubmissionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const { t, locale } = useI18n()
  const turnstileEnabled = isTurnstileEnabledClient()
  const turnstileSiteKey = getTurnstileSiteKeyClient()

  const genres = useMemo(
    () =>
      genreKeys.map((key) => ({
        key,
        label: t.demo.genres[genreKeyMap[key] as keyof typeof t.demo.genres],
      })),
    [t]
  )

  const demoSubmissionSchema = useMemo(
    () =>
      z.object({
        artistName: z
          .string()
          .min(2, t.validation.artistNameMin)
          .max(100, t.validation.artistNameMax),
        email: z.string().email(t.validation.emailInvalid),
        trackName: z
          .string()
          .min(2, t.validation.trackNameMin)
          .max(100, t.validation.trackNameMax),
        genre: z.enum(['Hip-Hop', 'R&B', 'Pop', 'Electronic', 'Indie Rock', 'Alternative Rock', 'Other'], {
          errorMap: () => ({ message: t.validation.genreInvalid }),
        }),
        demoLink: z.string().url(t.validation.urlInvalid),
        description: z.string().max(500, t.validation.descriptionMax).optional(),
        consent: z.literal(true, {
          errorMap: () => ({
            message: "Необходимо дать согласие на обработку персональных данных",
          }),
        }),
      }),
    [t]
  )

  const form = useForm<DemoSubmissionFormValues>({
    resolver: zodResolver(demoSubmissionSchema),
    defaultValues: {
      artistName: "",
      email: "",
      trackName: "",
      genre: undefined,
      demoLink: "",
      description: "",
      consent: false,
    },
  })

  const onSubmit = async (data: DemoSubmissionFormValues) => {
    if (turnstileEnabled && !captchaToken) {
      toast.error(locale === "ru" ? "Подтвердите, что вы не робот" : "Please confirm you are not a robot")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/demo", {
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
        toast.success(result.message || t.demo.success)
        form.reset()
        setCaptchaToken(null)
        onOpenChange(false)
      } else {
        toast.error(result.error || t.demo.error)
      }
    } catch (error) {
      console.error("Demo submission error:", error)
      toast.error(t.demo.errorGeneric)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t.demo.title}</DialogTitle>
          <DialogDescription>{t.demo.description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="artistName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t.demo.form.artistName}{" "}
                      <span className="text-destructive" aria-label={t.contact.form.required}>
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t.demo.form.artistName}
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
                      {t.demo.form.email}{" "}
                      <span className="text-destructive" aria-label={t.contact.form.required}>
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t.demo.form.email}
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

            <div className="grid md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="trackName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t.demo.form.trackName}{" "}
                      <span className="text-destructive" aria-label={t.contact.form.required}>
                        *
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t.demo.form.trackName}
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
                name="genre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t.demo.form.genre}{" "}
                      <span className="text-destructive" aria-label={t.contact.form.required}>
                        *
                      </span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-background border-border w-full">
                          <SelectValue placeholder={t.demo.form.selectGenre} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {genres.map((genre) => (
                          <SelectItem key={genre.key} value={genre.key}>
                            {genre.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="demoLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t.demo.form.demoLink}{" "}
                    <span className="text-destructive" aria-label={t.contact.form.required}>
                      *
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t.demo.form.demoLinkPlaceholder}
                      className="bg-background border-border"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t.demo.form.demoLinkDescription}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.demo.form.description}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t.demo.form.descriptionPlaceholder}
                      className="bg-background border-border min-h-[100px]"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{t.demo.form.descriptionHint}</FormDescription>
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
                  <div className="space-y-1 leading-none text-sm text-muted-foreground">
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
              <div className="flex justify-center">
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                  options={{
                    theme: "dark",
                  }}
                />
              </div>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t.demo.form.cancel}
              </Button>
              <Button
                type="submit"
                className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? t.demo.form.submitting : t.demo.form.submit}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

