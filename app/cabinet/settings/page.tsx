"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/cabinet/shared/page-header"
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
      <PageHeader
        title="Настройки"
        description="Профиль для договора и безопасность аккаунта"
      />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = v === "security" ? "security" : "profile"
          setTab(next)
          const url = next === "profile" ? "/cabinet/settings?tab=profile" : "/cabinet/settings?tab=security"
          router.replace(url, { scroll: false })
        }}
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="profile">Профиль</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-6 focus-visible:outline-none">
          <CabinetProfileTab />
        </TabsContent>
        <TabsContent value="security" className="mt-6 focus-visible:outline-none">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
