"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CabinetProfileTab } from "@/components/cabinet/settings/cabinet-profile-tab"
import { SecuritySettings } from "@/components/cabinet/settings/security-settings"

type SettingsTab = "profile" | "security"

export default function CabinetSettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const initial: SettingsTab = tabParam === "security" ? "security" : "profile"
  const [tab, setTab] = useState<SettingsTab>(initial)

  useEffect(() => {
    setTab(tabParam === "security" ? "security" : "profile")
  }, [tabParam])

  return (
    <div className="w-full max-w-none space-y-6">
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = v === "security" ? "security" : "profile"
          setTab(next)
          const url = next === "profile" ? "/cabinet/settings?tab=profile" : "/cabinet/settings?tab=security"
          router.replace(url, { scroll: false })
        }}
      >
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight md:text-[1.75rem] md:leading-tight">
            Настройки
          </h1>
          <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:min-w-[16rem]">
            <TabsTrigger value="profile">Профиль</TabsTrigger>
            <TabsTrigger value="security">Безопасность</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="profile" className="mt-0 focus-visible:outline-none">
          <CabinetProfileTab />
        </TabsContent>
        <TabsContent value="security" className="mt-0 focus-visible:outline-none">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
