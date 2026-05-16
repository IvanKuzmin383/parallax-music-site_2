"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Plus, Trash2, Edit, Download } from "lucide-react"
import { AdminSectionNav } from "@/components/admin-section-nav"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StreamingReport {
  id: string
  userId: string
  userEmail: string
  /** С сервера с GET /api/admin/reports; при отсутствии — как без имени артиста */
  artistName?: string | null
  amount: number
  fileName: string
  createdAt: string
  updatedAt: string
}

interface CabinetUser {
  id: string
  email: string
  artistName: string | null
}

function artistSortKey(user: CabinetUser): string {
  const name = user.artistName?.trim()
  if (name) return name.toLocaleLowerCase("ru-RU")
  return `\uFFFF${user.email.toLowerCase()}`
}

function artistOptionPrimary(user: CabinetUser): string {
  const name = user.artistName?.trim()
  return name || "Без имени артиста"
}

function reportArtistLine(artistName: string | null | undefined): string {
  const name = artistName?.trim()
  return name || "Без имени артиста"
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<StreamingReport[]>([])
  const [users, setUsers] = useState<CabinetUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<StreamingReport | null>(null)
  const [selectedUserId, setSelectedUserId] = useState("")
  const [amount, setAmount] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [editAmount, setEditAmount] = useState("")
  const [editFileName, setEditFileName] = useState("")
  const [submitLoading, setSubmitLoading] = useState(false)
  const router = useRouter()

  const usersSortedByArtist = useMemo(() => {
    return [...users].sort((a, b) => {
      const ka = artistSortKey(a)
      const kb = artistSortKey(b)
      const c = ka.localeCompare(kb, "ru-RU")
      return c !== 0 ? c : a.email.localeCompare(b.email, "ru-RU")
    })
  }, [users])

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId]
  )

  const loadData = async () => {
    try {
      const [reportsRes, usersRes] = await Promise.all([
        fetch("/api/admin/reports", { credentials: "include" }),
        fetch("/api/admin/cabinet-users", { credentials: "include" }),
      ])

      if (reportsRes.status === 401 || usersRes.status === 401) {
        setIsAuthenticated(false)
        router.replace("/admin26081993")
        return
      }

      if (reportsRes.ok && usersRes.ok) {
        const reportsData = await reportsRes.json()
        const usersData = await usersRes.json()
        setReports(reportsData.reports || [])
        setUsers(usersData.users || [])
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleAddReport = async () => {
    if (!selectedUserId || !amount || !file) {
      toast.error("Заполните все поля")
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum < 0) {
      toast.error("Сумма должна быть положительным числом")
      return
    }

    setSubmitLoading(true)
    try {
      const formData = new FormData()
      formData.append("userId", selectedUserId)
      formData.append("amount", amountNum.toString())
      formData.append("file", file)

      const response = await fetch("/api/admin/reports", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Отчет создан")
        setAddDialogOpen(false)
        setSelectedUserId("")
        setAmount("")
        setFile(null)
        loadData()
      } else {
        const err = await response.json()
        toast.error(err.error || "Не удалось создать отчет")
      }
    } catch (error) {
      console.error("Error creating report:", error)
      toast.error("Ошибка при создании отчета")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEditReport = async () => {
    if (!selectedReport) return

    const amountNum = parseFloat(editAmount)
    if (isNaN(amountNum) || amountNum < 0) {
      toast.error("Сумма должна быть положительным числом")
      return
    }

    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/admin/reports/${selectedReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          fileName: editFileName || selectedReport.fileName,
        }),
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Отчет обновлен")
        setEditDialogOpen(false)
        setSelectedReport(null)
        loadData()
      } else {
        const err = await response.json()
        toast.error(err.error || "Не удалось обновить отчет")
      }
    } catch (error) {
      console.error("Error updating report:", error)
      toast.error("Ошибка при обновлении отчета")
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeleteReport = async () => {
    if (!selectedReport) return

    try {
      const response = await fetch(`/api/admin/reports/${selectedReport.id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        toast.success("Отчет удален")
        setDeleteDialogOpen(false)
        setSelectedReport(null)
        loadData()
      } else {
        toast.error("Не удалось удалить отчет")
      }
    } catch (error) {
      console.error("Error deleting report:", error)
      toast.error("Ошибка при удалении отчета")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    router.replace("/admin26081993")
    return null
  }

  const totalAmount = reports.reduce((sum, report) => sum + report.amount, 0)

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-6">
        <AdminSectionNav active="reports" />

        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Отчеты по стримингу</h1>
            <p className="text-muted-foreground text-sm">
              Управление отчетами и балансами пользователей
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить отчет
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Общая сумма по всем отчетам</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalAmount.toLocaleString("ru-RU")} ₽</p>
          </CardContent>
        </Card>

        <div className="border rounded-lg divide-y">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Отчетов пока нет
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50"
              >
                <div className="flex-1">
                  <p className="font-medium">{reportArtistLine(report.artistName)}</p>
                  <p className="text-sm text-muted-foreground">{report.userEmail}</p>
                  <p className="text-sm text-muted-foreground">
                    Сумма: <span className="font-medium">{report.amount.toLocaleString("ru-RU")} ₽</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Файл: {report.fileName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Создан: {format(new Date(report.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedReport(report)
                      setEditAmount(report.amount.toString())
                      setEditFileName(report.fileName)
                      setEditDialogOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Редактировать
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedReport(report)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить отчет</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Артист</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={submitLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите артиста" />
                </SelectTrigger>
                <SelectContent className="max-h-[min(24rem,70vh)]">
                  {usersSortedByArtist.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {artistOptionPrimary(user)} · {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Пользователь (аккаунт)</label>
              <Input
                readOnly
                tabIndex={-1}
                value={selectedUser?.email ?? ""}
                placeholder="Выберите артиста выше"
                className="bg-muted/50 text-muted-foreground"
                disabled={submitLoading}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Email подставляется из выбранного артиста.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Сумма (RUB)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={submitLoading}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Файл отчета</label>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={submitLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false)
                setSelectedUserId("")
                setAmount("")
                setFile(null)
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleAddReport}
              disabled={submitLoading || !selectedUserId || !amount || !file}
            >
              {submitLoading ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать отчет</DialogTitle>
          </DialogHeader>
          {selectedReport ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-0.5 -mt-2">
              <p className="font-medium">{reportArtistLine(selectedReport.artistName)}</p>
              <p className="text-xs text-muted-foreground">{selectedReport.userEmail}</p>
            </div>
          ) : null}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Сумма (RUB)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                disabled={submitLoading}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Имя файла</label>
              <Input
                value={editFileName}
                onChange={(e) => setEditFileName(e.target.value)}
                disabled={submitLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setSelectedReport(null)
              }}
            >
              Отмена
            </Button>
            <Button
              onClick={handleEditReport}
              disabled={submitLoading || !editAmount}
            >
              {submitLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить отчет?</AlertDialogTitle>
            <AlertDialogDescription>
              Отчёт для артиста «{selectedReport ? reportArtistLine(selectedReport.artistName) : "—"}» (
              {selectedReport?.userEmail}) будет удалён. Баланс пользователя будет уменьшен на сумму отчёта. Это действие
              нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReport}
              className="bg-destructive text-destructive-foreground"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
