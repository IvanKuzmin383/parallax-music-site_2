"use client"

import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { MOCK_TRANSACTIONS, TRANSACTION_TYPE_LABELS } from "@/lib/cabinet/mock"

export default function FinanceTransactionsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="История операций" description="Демо-данные. Полный ledger будет подключён позже." />

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Описание</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_TRANSACTIONS.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell>{format(new Date(tx.date), "d MMM yyyy", { locale: ru })}</TableCell>
                <TableCell>{TRANSACTION_TYPE_LABELS[tx.type]}</TableCell>
                <TableCell className={tx.amount < 0 ? "text-destructive" : ""}>
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount.toLocaleString("ru-RU")} ₽
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={tx.status === "completed" ? "completed" : tx.status === "pending" ? "awaiting_payment" : "cancelled"}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{tx.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
