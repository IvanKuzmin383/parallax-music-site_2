"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CabinetProfileForm } from "@/components/cabinet-profile-form"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Link from "next/link"
import { Check, Crown, Loader2, Wallet, X } from "lucide-react"
import {
  cabinetUserToProfileFormValues,
  type ProfileFormValues,
} from "@/lib/cabinet-counterparty"
import { PROFILE_INCOMPLETE_LEGAL_BASIS_RU } from "@/lib/cabinet-upload-profile-gate"
import { subscriptionNameToPlanId } from "@/lib/plan-pricing"
import { getEffectiveTrackLimit } from "@/lib/subscription-plans"
import type { CabinetUser } from "@/lib/cabinet-users"

type AutopayApiResponse = {
  autopayEnabled: boolean
  autopayNextChargeAt: string | null
  nextAmountRub: string | null
  disableDeadlineYmd: string | null
  manualDisableEmail: string
}

type CabinetProfileResponse = {
  user?: Omit<CabinetUser, "passwordHash">
  uploadedTracksCount?: number
  profileCompleteForUpload?: boolean
}

export default function CabinetProfilePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<{
    subscriptionName?: string
    subscriptionExpiresAt?: string
    subscriptionTrackLimit?: number
    purchasedTracksBalance?: number
  } | null>(null)
  const [streamingBalance, setStreamingBalance] = useState<number>(0)
  const [uploadedTracksCount, setUploadedTracksCount] = useState(0)
  const [profileCompleteForUpload, setProfileCompleteForUpload] = useState(true)
  const [autopayInfo, setAutopayInfo] = useState<AutopayApiResponse | null>(null)
  const [autopayBusy, setAutopayBusy] = useState(false)
  const [autopayDialogOpen, setAutopayDialogOpen] = useState(false)
  const [legalBasisDialogOpen, setLegalBasisDialogOpen] = useState(false)
  const [profileFormDefaults, setProfileFormDefaults] = useState<ProfileFormValues | null>(null)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/cabinet/profile", { credentials: "include" })
        if (res.status === 401) {
          router.replace("/cabinet")
          return
        }
        if (!res.ok) {
          toast.error("Не удалось загрузить профиль")
          return
        }
        const data: CabinetProfileResponse = await res.json()
        const u = data.user
        if (!u) return

        setProfileUserId(u.id)
        setProfileFormDefaults(cabinetUserToProfileFormValues(u))

        setSubscription({
          subscriptionName: u.subscriptionName,
          subscriptionExpiresAt: u.subscriptionExpiresAt,
          subscriptionTrackLimit: u.subscriptionTrackLimit,
          purchasedTracksBalance: u.purchasedTracksBalance,
        })
        setStreamingBalance(u.streamingBalance ?? 0)
        setUploadedTracksCount(
          typeof data.uploadedTracksCount === "number" ? data.uploadedTracksCount : 0
        )
        setProfileCompleteForUpload(data.profileCompleteForUpload !== false)

        const ar = await fetch("/api/cabinet/subscription/autopay", { credentials: "include" })
        if (ar.ok) {
          setAutopayInfo((await ar.json()) as AutopayApiResponse)
        }
      } catch {
        toast.error("Ошибка загрузки профиля")
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  const effectiveLimit: number | null = subscription?.subscriptionName
    ? getEffectiveTrackLimit({
        subscriptionName: subscription.subscriptionName,
        subscriptionTrackLimit: subscription.subscriptionTrackLimit,
        purchasedTracksBalance: subscription.purchasedTracksBalance,
      })
    : null

  const renewPlanId = subscriptionNameToPlanId(subscription?.subscriptionName)

  const [saving, setSaving] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 pt-20 flex items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 pt-20">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/cabinet">
                <span aria-hidden="true">←</span>
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Профиль</h1>
              <p className="text-muted-foreground text-sm">
                Заполните обязательные данные для договора
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Card className="border-primary/20 bg-primary/5 py-4 gap-3">
            <CardHeader className="pb-2 gap-1">
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Тариф
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {subscription?.subscriptionName ? (
                <>
                  <div className="font-semibold text-lg">{subscription.subscriptionName}</div>
                  {subscription.subscriptionName === "Fix" && effectiveLimit != null && (
                    <div className="text-sm text-muted-foreground">
                      Лимит треков: {effectiveLimit} (Доступно:{" "}
                      {Math.max(0, effectiveLimit - uploadedTracksCount)})
                    </div>
                  )}
                  {subscription.subscriptionName !== "Fix" && subscription.subscriptionExpiresAt && (
                    <div className="text-sm text-muted-foreground">
                      Действует до:{" "}
                      {format(
                        new Date(subscription.subscriptionExpiresAt),
                        "d MMMM yyyy",
                        { locale: ru },
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-muted-foreground">Тариф не выбран</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-green-500/20 bg-green-500/5 py-4 gap-3">
            <CardHeader className="pb-2 gap-1">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                Баланс
              </CardTitle>
              <CardDescription>Доходы от стриминга</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {streamingBalance.toLocaleString("ru-RU")} ₽
              </div>
            </CardContent>
          </Card>
        </div>

        {subscription?.subscriptionName && subscription.subscriptionName !== "Fix" ? (
          <>
            <Card className="border-border py-0 gap-0">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                {autopayInfo == null ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                ) : autopayInfo.autopayEnabled ? (
                  <Check
                    className="h-5 w-5 shrink-0 text-green-600"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                ) : (
                  <X className="h-5 w-5 shrink-0 text-red-500" strokeWidth={2.5} aria-hidden />
                )}
                <button
                  type="button"
                  className="text-left text-sm font-medium text-primary underline-offset-4 hover:underline"
                  onClick={() => setAutopayDialogOpen(true)}
                >
                  Автопродление подписки
                </button>
              </CardContent>
            </Card>

            <Dialog open={autopayDialogOpen} onOpenChange={setAutopayDialogOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Автопродление подписки</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  {autopayInfo?.autopayEnabled ? (
                    <>
                      {autopayInfo.autopayNextChargeAt ? (
                        <p>
                          <span className="text-muted-foreground">Плановое списание: </span>
                          {format(new Date(autopayInfo.autopayNextChargeAt), "d MMMM yyyy", {
                            locale: ru,
                          })}{" "}
                          (московское время)
                        </p>
                      ) : null}
                      {autopayInfo.nextAmountRub ? (
                        <p>
                          <span className="text-muted-foreground">Сумма: </span>
                          {autopayInfo.nextAmountRub} ₽
                        </p>
                      ) : null}
                      {autopayInfo.disableDeadlineYmd ? (
                        <p className="text-muted-foreground">
                          Чтобы отключить до очередного списания (рабочие дни РФ), лучше сделать это не
                          позднее {autopayInfo.disableDeadlineYmd.split("-").reverse().join(".")}.
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={autopayBusy}
                        onClick={async () => {
                          setAutopayBusy(true)
                          try {
                            const res = await fetch("/api/cabinet/subscription/autopay", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              credentials: "include",
                              body: JSON.stringify({ action: "request_disable" }),
                            })
                            const data = await res.json().catch(() => ({}))
                            if (res.ok) {
                              toast.success(
                                "Проверьте почту — ссылка для подтверждения отключения",
                              )
                            } else {
                              toast.error(
                                typeof data.error === "string"
                                  ? data.error
                                  : "Не удалось отправить письмо",
                              )
                            }
                          } catch {
                            toast.error("Ошибка сети")
                          } finally {
                            setAutopayBusy(false)
                          }
                        }}
                      >
                        Отключить автопродление (письмо)
                      </Button>
                      {autopayInfo.manualDisableEmail ? (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Либо напишите на {autopayInfo.manualDisableEmail} с того же email, что указан
                          в аккаунте или при оплате — см. п. 5.5 оферты.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-muted-foreground">
                        Автопродление не активно (нет сохранённой карты или отключено).
                      </p>
                      {renewPlanId ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/pay/${renewPlanId}`}>Продлить подписку</Link>
                        </Button>
                      ) : null}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : null}

        {!profileCompleteForUpload ? (
          <>
            <Card className="border-primary/35 bg-primary/[0.06] py-0 gap-0">
              <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 px-4">
                <span className="text-sm font-medium text-foreground">Почему нужны эти данные</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setLegalBasisDialogOpen(true)}>
                  Подробнее
                </Button>
              </CardContent>
            </Card>

            <Dialog open={legalBasisDialogOpen} onOpenChange={setLegalBasisDialogOpen}>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Почему нужны эти данные</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {PROFILE_INCOMPLETE_LEGAL_BASIS_RU}
                </p>
              </DialogContent>
            </Dialog>
          </>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Данные для договора</CardTitle>
            <CardAction>
              <Link
                href="/offer"
                className="text-sm font-normal text-primary hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Публичная оферта - Лицензионное соглашение
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            {profileFormDefaults && profileUserId ? (
              <CabinetProfileForm
                key={`${profileUserId}-${profileFormDefaults.counterpartyType}`}
                defaultValues={profileFormDefaults}
                saving={saving}
                onSavingChange={setSaving}
                onSaved={(complete) => {
                  setProfileCompleteForUpload(complete)
                  router.refresh()
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Загрузка формы...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
