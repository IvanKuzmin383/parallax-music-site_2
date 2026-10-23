"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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

export default function CabinetSettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [tab, setTab] = useState<SettingsTab>(() => parseTab(tabParam))

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
          router.replace(`/cabinet/settings?tab=${next}`, { scroll: false })
        }}
      >
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
          <h1 className="shrink-0 text-2xl font-bold tracking-tight md:text-[1.75rem] md:leading-tight">
            {tab === "achievements" ? "Достижения и бонусы" : "Настройки"}
          </h1>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 sm:w-auto sm:min-w-[28rem]">
            <TabsTrigger value="profile">Профиль</TabsTrigger>
            <TabsTrigger value="security">Безопасность</TabsTrigger>
            <TabsTrigger value="notifications">Уведомления</TabsTrigger>
            <TabsTrigger value="achievements">Достижения</TabsTrigger>
          </TabsList>
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
          <CabinetAchievementsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
