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
import { Crown } from "lucide-react"
import { CabinetSubscriptionAutopayPanel } from "@/components/cabinet/subscription/cabinet-subscription-autopay-panel"
import {
  cabinetUserToProfileFormValues,
  type ProfileFormValues,
} from "@/lib/cabinet-counterparty"
import { PROFILE_INCOMPLETE_LEGAL_BASIS_RU } from "@/lib/cabinet-upload-profile-gate"
import { subscriptionNameToPlanId } from "@/lib/plan-pricing"
import { useCabinetSubscription } from "@/components/cabinet/subscription/cabinet-subscription-provider"
import { shouldDeductFixPackCreditsOnUpload } from "@/lib/fix-pricing-legacy"
import { getEffectiveTrackLimit } from "@/lib/subscription-plans"
import { getFixRemainingUploadSlots } from "@/lib/subscription-track-limits"
import type { CabinetUser } from "@/lib/cabinet-users"
import { CabinetKycStatusBadge } from "@/components/cabinet/kyc/cabinet-kyc-status-badge"
import { useCabinetKyc } from "@/components/cabinet/kyc/cabinet-kyc-provider"

type CabinetProfileResponse = {
  user?: Omit<CabinetUser, "passwordHash">
  uploadedTracksCount?: number
  profileCompleteForUpload?: boolean
}

export function CabinetProfileTab() {
  const router = useRouter()
  const { status: kycStatus } = useCabinetKyc()
  const { openCheckout } = useCabinetSubscription()

  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<{
    subscriptionName?: string
    subscriptionExpiresAt?: string
    subscriptionTrackLimit?: number
    purchasedTracksBalance?: number
    createdAt?: string
  } | null>(null)
  const [uploadedTracksCount, setUploadedTracksCount] = useState(0)
  const [profileCompleteForUpload, setProfileCompleteForUpload] = useState(true)
  const [legalBasisDialogOpen, setLegalBasisDialogOpen] = useState(false)
  const [profileFormDefaults, setProfileFormDefaults] = useState<ProfileFormValues | null>(null)
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
          createdAt: u.createdAt,
        })
        setUploadedTracksCount(
          typeof data.uploadedTracksCount === "number" ? data.uploadedTracksCount : 0
        )
        setProfileCompleteForUpload(data.profileCompleteForUpload !== false)
      } catch {
        toast.error("Ошибка загрузки профиля")
      } finally {
        setLoading(false)
      }
    })()
  }, [router, kycStatus])

  const effectiveLimit: number | null = subscription?.subscriptionName
    ? getEffectiveTrackLimit({
        subscriptionName: subscription.subscriptionName,
        subscriptionTrackLimit: subscription.subscriptionTrackLimit,
        purchasedTracksBalance: subscription.purchasedTracksBalance,
      })
    : null

  const fixUsesWalletModel =
    subscription?.subscriptionName === "Fix" &&
    shouldDeductFixPackCreditsOnUpload({
      subscriptionName: "Fix",
      createdAt: subscription.createdAt,
    })

  const fixTracksAvailable =
    subscription?.subscriptionName === "Fix" && subscription
      ? fixUsesWalletModel
        ? getFixRemainingUploadSlots(subscription)
        : Math.max(0, (effectiveLimit ?? 0) - uploadedTracksCount)
      : 0

  const renewPlanId = subscriptionNameToPlanId(subscription?.subscriptionName)

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-none space-y-4">
        <Card id="cabinet-tariff" className="scroll-mt-20 py-4 gap-3">
          <CardContent className="grid gap-4 sm:grid-cols-2 sm:gap-6">
            <div className="space-y-2 min-w-0">
              <div>
                <p className="text-base font-semibold leading-none">Верификация</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Нужна для загрузки релизов, клипов и вывода роялти
                </p>
              </div>
              <CabinetKycStatusBadge className="max-w-sm" />
            </div>
            <div className="space-y-2 min-w-0 sm:border-l sm:border-border sm:pl-6">
              <p className="flex items-center gap-2 text-base font-semibold leading-none">
                <Crown className="h-4 w-4 text-primary" />
                Тариф
              </p>
              {subscription?.subscriptionName ? (
                <>
                  <div className="font-semibold text-lg">{subscription.subscriptionName}</div>
                  {subscription.subscriptionName === "Fix" && effectiveLimit != null && (
                    <div className="text-sm text-muted-foreground">
                      {fixUsesWalletModel ? (
                        <>
                          Оплачено слотов: {effectiveLimit} (доступно для загрузки:{" "}
                          {fixTracksAvailable})
                        </>
                      ) : (
                        <>
                          Лимит треков: {effectiveLimit} (доступно: {fixTracksAvailable})
                        </>
                      )}
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
              <div className="flex flex-wrap gap-2 pt-1">
                {renewPlanId ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openCheckout({ planId: renewPlanId })}
                  >
                    Продлить
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="outline">
                  <Link href="/cabinet/subscription">Все тарифы</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <CabinetSubscriptionAutopayPanel
          subscriptionName={subscription?.subscriptionName}
          variant="row"
        />

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
                key={`${profileUserId}-${profileFormDefaults.counterpartyType}-${profileFormDefaults.lastName}-${profileFormDefaults.firstName}-${profileFormDefaults.phone}`}
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
  )
}
