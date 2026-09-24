"use client"

import { Receipt } from "lucide-react"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { EmptyState } from "@/components/cabinet/shared/empty-state"

export default function FinanceTransactionsPage() {
  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="История операций" />
      <EmptyState title="Операций пока нет" description="Здесь появится история начислений и списаний" icon={Receipt} />
    </div>
  )
}
