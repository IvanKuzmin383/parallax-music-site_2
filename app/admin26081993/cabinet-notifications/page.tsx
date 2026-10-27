"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Bell, Search } from "lucide-react"
import { toast } from "sonner"
import { AdminSectionNav } from "@/components/admin-section-nav"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type CabinetUser = {
  id: string
  email: string
  artistName?: string
  isDisabled?: boolean
}

type Audience = "all" | "selected"

export default function AdminCabinetNotificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [users, setUsers] = useState<CabinetUser[]>([])
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [audience, setAudience] = useState<Audience>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [userSearch, setUserSearch] = useState("")
  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/cabinet-announcements", { credentials: "include" }),
      fetch("/api/admin/cabinet-users", { credentials: "include" }),
    ])
      .then(async ([authRes, usersRes]) => {
        if (authRes.status === 401 || usersRes.status === 401) {
          setIsAuthenticated(false)
          return
        }
        setIsAuthenticated(true)
        if (usersRes.ok) {
          const data = (await usersRes.json()) as { users?: CabinetUser[] }
          setUsers(data.users ?? [])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => {
      const email = u.email.toLowerCase()
      const name = (u.artistName || "").toLowerCase()
      return email.includes(q) || name.includes(q) || u.id.toLowerCase().includes(q)
    })
  }, [users, userSearch])

  const recipientCount =
    audience === "all" ? users.length : selectedIds.size

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const u of filteredUsers) next.add(u.id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const openConfirm = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      toast.error("Заполните заголовок и текст")
      return
    }
    if (audience === "selected" && selectedIds.size === 0) {
      toast.error("Выберите хотя бы одного пользователя")
      return
    }
    if (recipientCount === 0) {
      toast.error("Нет получателей")
      return
    }
    setConfirmOpen(true)
  }

  const handleSend = async () => {
    setSending(true)
    try {
      const res = await fetch("/api/admin/cabinet-notifications/broadcast", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          audience,
          userIds: audience === "selected" ? [...selectedIds] : undefined,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(data?.error || "Не удалось отправить")
        return
      }
      const data = (await res.json()) as { sent?: number }
      toast.success(`Отправлено: ${data.sent ?? 0}`)
      setTitle("")
      setBody("")
      setConfirmOpen(false)
    } catch {
      toast.error("Ошибка запроса")
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-4 flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    router.replace("/admin26081993")
    return null
  }

  return (
    <div className="min-h-screen bg-background pt-4">
      <div className="mx-auto w-full max-w-none px-4 space-y-8">
        <AdminSectionNav active="cabinet-notifications" />

        <div className="space-y-8">
          <div className="flex items-start gap-3">
            <Bell className="h-8 w-8 text-muted-foreground shrink-0 mt-1" />
            <div>
              <h1 className="text-2xl font-bold">Колокольчик</h1>
              <p className="text-muted-foreground text-sm">
                Сообщение попадёт в уведомления кабинета. URL в тексте станут кликабельными.
              </p>
            </div>
          </div>

          <form onSubmit={openConfirm} className="border rounded-lg p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="n-title">Заголовок</Label>
              <Input
                id="n-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Краткий заголовок"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n-body">Текст</Label>
              <Textarea
                id="n-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Текст уведомления. Можно вставить https://..."
                rows={5}
                className="resize-y min-h-[120px]"
              />
            </div>

            <div className="space-y-3">
              <Label>Кому</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={audience === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAudience("all")}
                >
                  Всем ({users.length})
                </Button>
                <Button
                  type="button"
                  variant={audience === "selected" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAudience("selected")}
                >
                  Выбранным{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                </Button>
              </div>
            </div>

            {audience === "selected" ? (
              <div className="space-y-3 rounded-md border p-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Поиск по email, имени, id"
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={selectFiltered}>
                    Выбрать найденных ({filteredUsers.length})
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                    Сбросить выбор
                  </Button>
                </div>
                <ul className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
                  {filteredUsers.length === 0 ? (
                    <li className="text-sm text-muted-foreground px-1 py-2">Никого не найдено</li>
                  ) : (
                    filteredUsers.map((u) => {
                      const checked = selectedIds.has(u.id)
                      return (
                        <li key={u.id}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60",
                              checked && "bg-muted/40"
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={checked}
                              onChange={() => toggleUser(u.id)}
                            />
                            <span className="min-w-0">
                              <span className="block font-medium truncate">{u.email}</span>
                              <span className="block text-xs text-muted-foreground truncate">
                                {u.artistName || u.id}
                                {u.isDisabled ? " · отключён" : ""}
                              </span>
                            </span>
                          </label>
                        </li>
                      )
                    })
                  )}
                </ul>
              </div>
            ) : null}

            <Button type="submit" disabled={sending}>
              Отправить в колокольчик
            </Button>
          </form>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отправить уведомление?</AlertDialogTitle>
            <AlertDialogDescription>
              Получателей: {recipientCount}.
              {audience === "all"
                ? " Сообщение уйдёт всем пользователям кабинета, включая отключённых."
                : " Сообщение уйдёт только выбранным."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Отмена</AlertDialogCancel>
            <AlertDialogAction disabled={sending} onClick={() => void handleSend()}>
              {sending ? "Отправка..." : "Отправить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
