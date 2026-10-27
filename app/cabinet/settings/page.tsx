"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Gift } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CabinetProfileTab } from "@/components/cabinet/settings/cabinet-profile-tab"
import { SecuritySettings } from "@/components/cabinet/settings/security-settings"
import { CabinetAchievementsTab } from "@/components/cabinet/settings/cabinet-achievements-tab"
import { CabinetTelegramSettings } from "@/components/cabinet/settings/cabinet-telegram-settings"

type SettingsTab = "profile" | "security" | "notifications" | "achievements"

function parseTab(tabParam: string | null): SettingsTab {
  if (tabParam === "security") return "security"
  if (tabParam === "notifications") return "notifications"
  if (tabParam === "achievements") return "achievements"
  return "profile"
}

function bonusesLabel(count: number): string {
  if (count === 1) return "бонус доступен"
  if (count > 1 && count < 5) return "бонуса доступно"
  return "бонусов доступно"
}

export default function CabinetSettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [tab, setTab] = useState<SettingsTab>(() => parseTab(tabParam))
  const [availableBonuses, setAvailableBonuses] = useState(0)

  const onAvailableBonusesChange = useCallback((count: number) => {
    setAvailableBonuses(count)
  }, [])

  useEffect(() => {
    setTab(parseTab(tabParam))
  }, [tabParam])

  return (
    <div className="w-full max-w-none space-y-6">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = parseTab(v)
          setTab(next)
          if (next !== "achievements") setAvailableBonuses(0)
          router.replace(`/cabinet/settings?tab=${next}`, { scroll: false })
        }}
      >
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
          <h1 className="shrink-0 text-2xl font-bold tracking-tight md:text-[1.75rem] md:leading-tight">
            {tab === "achievements" ? "Достижения и бонусы" : "Настройки"}
          </h1>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 sm:w-auto sm:min-w-[28rem]">
              <TabsTrigger value="profile">Профиль</TabsTrigger>
              <TabsTrigger value="security">Безопасность</TabsTrigger>
              <TabsTrigger value="notifications">Уведомления</TabsTrigger>
              <TabsTrigger value="achievements">Достижения</TabsTrigger>
            </TabsList>
            {tab === "achievements" && availableBonuses > 0 ? (
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("achievements-coupons")
                  el?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
                className="inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-full border border-primary/35 bg-primary/15 px-3.5 py-1.5 text-sm font-medium text-primary shadow-[0_0_24px_rgba(240,31,67,0.2)] transition-colors hover:bg-primary/25 sm:self-auto"
              >
                <Gift className="h-4 w-4" />
                {availableBonuses} {bonusesLabel(availableBonuses)}
              </button>
            ) : null}
          </div>
        </div>
        <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
          <CabinetProfileTab />
        </TabsContent>
        <TabsContent value="security" className="mt-0 focus-visible:outline-none">
          <SecuritySettings />
        </TabsContent>
        <TabsContent value="notifications" className="mt-0 focus-visible:outline-none">
          <CabinetTelegramSettings />
        </TabsContent>
        <TabsContent value="achievements" className="mt-0 focus-visible:outline-none">
          <CabinetAchievementsTab onAvailableBonusesChange={onAvailableBonusesChange} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
