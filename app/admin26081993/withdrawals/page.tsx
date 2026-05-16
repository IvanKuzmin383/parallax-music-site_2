"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Wallet, Clock, CheckCircle, XCircle } from "lucide-react"
import { AdminSectionNav } from "@/components/admin-section-nav"

interface WithdrawalRequest {
  id: string
  userId: string
  userEmail: string
  amount: number
  type: "sbp" | "card"
  phone?: string
  cardNumber?: string
  bank?: string
  recipientName: string
  status: "pending" | "rejected" | "completed"
  createdAt: string
  updatedAt: string
}

export default function AdminWithdrawalsPage() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const router = useRouter()

  const loadRequests = async () => {
    const response = await fetch("/api/admin/withdrawals", { credentials: "include" })
    if (response.ok) {
      const data = await response.json()
      setRequests(data.requests || [])
    } else if (response.status === 401) {
      setIsAuthenticated(false)
    }
  }

  useEffect(() => {
    fetch("/api/admin/withdrawals", { credentials: "include" })
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true)
          return res.json()
        }
        if (res.status === 401) setIsAuthenticated(false)
        return null
      })
      .then((data) => {
        if (data?.requests) setRequests(data.requests)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleStatusChange = async (requestId: string, newStatus: "pending" | "rejected" | "completed") => {
    setUpdatingStatus(requestId)
    try {
      const response = await fetch(`/api/admin/withdrawals/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        toast.success("Статус заявки обновлен")
        await loadRequests()
      } else {
        const error = await response.json()
        toast.error(error.error || "Ошибка при обновлении статуса")
      }
    } catch (error) {
      console.error("Error updating status:", error)
      toast.error("Ошибка при обновлении статуса")
    } finally {
      setUpdatingStatus(null)
    }
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "В процессе", icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950" }
      case "completed":
        return { label: "Исполнено", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-950" }
      case "rejected":
        return { label: "Отклонено", icon: XCircle, color: "text-destructive", bgColor: "bg-red-50 dark:bg-red-950" }
      default:
        return { label: status, icon: Clock, color: "text-muted-foreground", bgColor: "bg-muted" }
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Необходима авторизация</p>
            <Button onClick={() => router.push("/admin26081993")}>
              Перейти на страницу входа
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-6">
        <AdminSectionNav active="withdrawals" />

        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-8 w-8" />
            Заявки на вывод средств
          </h1>
          <p className="text-muted-foreground mt-1">
            Управление заявками на вывод средств от пользователей
          </p>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Заявок на вывод пока нет</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const statusConfig = getStatusConfig(request.status)
              const StatusIcon = statusConfig.icon

              return (
                <div
                  key={request.id}
                  className="border rounded-lg p-6 space-y-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusConfig.bgColor}`}>
                          <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
                          <span className={`text-sm font-medium ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <span className="text-2xl font-bold">
                          {request.amount.toLocaleString("ru-RU")} ₽
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Пользователь</p>
                          <p className="font-medium">{request.userEmail}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Тип вывода</p>
                          <p className="font-medium">{request.type === "sbp" ? "СБП" : "Банковская карта"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">ФИО получателя</p>
                          <p className="font-medium">{request.recipientName}</p>
                        </div>
                        {request.type === "sbp" && request.phone && (
                          <div>
                            <p className="text-muted-foreground">Номер телефона</p>
                            <p className="font-medium">{request.phone}</p>
                          </div>
                        )}
                        {request.type === "card" && (
                          <>
                            {request.cardNumber && (
                              <div>
                                <p className="text-muted-foreground">Номер карты</p>
                                <p className="font-medium">{request.cardNumber}</p>
                              </div>
                            )}
                            {request.bank && (
                              <div>
                                <p className="text-muted-foreground">Банк</p>
                                <p className="font-medium">{request.bank}</p>
                              </div>
                            )}
                          </>
                        )}
                        <div>
                          <p className="text-muted-foreground">Дата создания</p>
                          <p className="font-medium">
                            {format(new Date(request.createdAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                          </p>
                        </div>
                        {request.updatedAt !== request.createdAt && (
                          <div>
                            <p className="text-muted-foreground">Последнее обновление</p>
                            <p className="font-medium">
                              {format(new Date(request.updatedAt), "d MMMM yyyy, HH:mm", { locale: ru })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <label className="text-sm font-medium">Изменить статус</label>
                      <Select
                        value={request.status}
                        onValueChange={(value) => handleStatusChange(request.id, value as "pending" | "rejected" | "completed")}
                        disabled={updatingStatus === request.id}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-amber-600" />
                              В процессе
                            </div>
                          </SelectItem>
                          <SelectItem value="completed">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Исполнено
                            </div>
                          </SelectItem>
                          <SelectItem value="rejected">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-destructive" />
                              Отклонено
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {updatingStatus === request.id && (
                        <p className="text-xs text-muted-foreground">Обновление...</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
