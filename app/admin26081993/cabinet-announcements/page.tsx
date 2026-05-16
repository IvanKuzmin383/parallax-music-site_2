"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
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
import { Megaphone, Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react"
import { AdminSectionNav } from "@/components/admin-section-nav"

type Announcement = {
  id: string
  title: string
  body: string
  active: boolean
  createdAt: string
}

export default function AdminCabinetAnnouncementsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [items, setItems] = useState<Announcement[]>([])
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")
  const [editLoading, setEditLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Announcement | null>(null)

  const load = async () => {
    const res = await fetch("/api/admin/cabinet-announcements", { credentials: "include" })
    if (res.ok) {
      const data = await res.json()
      setItems(data.announcements || [])
    } else if (res.status === 401) {
      setIsAuthenticated(false)
    }
  }

  useEffect(() => {
    fetch("/api/admin/cabinet-announcements", { credentials: "include" })
      .then((res) => {
        if (res.ok) {
          setIsAuthenticated(true)
          return res.json()
        }
        if (res.status === 401) setIsAuthenticated(false)
        return null
      })
      .then((data) => {
        if (data?.announcements) setItems(data.announcements)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) {
      toast.error("Заполните заголовок и текст")
      return
    }
    setCreateLoading(true)
    try {
      const res = await fetch("/api/admin/cabinet-announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      })
      if (res.ok) {
        toast.success("Новость создана")
        setTitle("")
        setBody("")
        await load()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Не удалось создать")
      }
    } catch {
      toast.error("Ошибка запроса")
    } finally {
      setCreateLoading(false)
    }
  }

  const toggleActive = async (item: Announcement) => {
    try {
      const res = await fetch(`/api/admin/cabinet-announcements/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ active: !item.active }),
      })
      if (res.ok) {
        toast.success(item.active ? "Скрыта из кабинета" : "Снова показывается новым")
        await load()
      } else {
        toast.error("Не удалось обновить")
      }
    } catch {
      toast.error("Ошибка запроса")
    }
  }

  const openEdit = (item: Announcement) => {
    setEditing(item)
    setEditTitle(item.title)
    setEditBody(item.body)
    setEditOpen(true)
  }

  const handleEditSave = async () => {
    if (!editing) return
    if (!editTitle.trim() || !editBody.trim()) {
      toast.error("Заполните заголовок и текст")
      return
    }
    setEditLoading(true)
    try {
      const res = await fetch(`/api/admin/cabinet-announcements/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: editTitle.trim(), body: editBody.trim() }),
      })
      if (res.ok) {
        toast.success("Сохранено")
        setEditOpen(false)
        setEditing(null)
        await load()
      } else {
        toast.error("Не удалось сохранить")
      }
    } catch {
      toast.error("Ошибка запроса")
    } finally {
      setEditLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    try {
      const res = await fetch(`/api/admin/cabinet-announcements/${toDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) {
        toast.success("Удалено")
        setDeleteOpen(false)
        setToDelete(null)
        await load()
      } else {
        toast.error("Не удалось удалить")
      }
    } catch {
      toast.error("Ошибка запроса")
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

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-8">
        <AdminSectionNav active="cabinet-announcements" />

        <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-start gap-3">
          <Megaphone className="h-8 w-8 text-muted-foreground shrink-0 mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Новости личного кабинета</h1>
            <p className="text-muted-foreground text-sm">
              Текст показывается пользователям один раз, пока они не нажмут «Ок»
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate} className="border rounded-lg p-4 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Новая новость
          </h2>
          <div className="space-y-2">
            <Label htmlFor="ann-title">Заголовок</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Краткий заголовок окна"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ann-body">Текст</Label>
            <Textarea
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Текст уведомления"
              rows={4}
              className="resize-y min-h-[100px]"
            />
          </div>
          <Button type="submit" disabled={createLoading}>
            {createLoading ? "Создание..." : "Добавить"}
          </Button>
        </form>

        <div className="space-y-4">
          <h2 className="font-semibold">Все новости</h2>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">Пока пусто</p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="border rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{item.title}</span>
                      {item.active ? (
                        <Eye className="h-4 w-4 text-green-600 shrink-0" aria-label="Активна" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Скрыта" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.body}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(item.createdAt), "d MMM yyyy HH:mm", { locale: ru })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button type="button" variant="outline" size="sm" onClick={() => void toggleActive(item)}>
                      {item.active ? "Скрыть" : "Показать"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setToDelete(item)
                        setDeleteOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Редактирование</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Заголовок</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Текст</Label>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={5}
                className="resize-y min-h-[120px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void handleEditSave()} disabled={editLoading}>
              {editLoading ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить новость?</AlertDialogTitle>
            <AlertDialogDescription>
              «{toDelete?.title}» будет удалена. Для пользователей, которые уже нажали «Ок»,
              ничего не изменится; новые пользователи не увидят эту запись.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => void handleDelete()}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
