"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AnnouncementBody } from "@/components/announcement-body"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type Announcement = {
  id: string
  title: string
  body: string
}

export function CabinetAnnouncementsHost() {
  const [queue, setQueue] = useState<Announcement[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dismissing, setDismissing] = useState(false)

  const loadPending = useCallback(async () => {
    const res = await fetch("/api/cabinet/announcements", { credentials: "include" })
    if (res.status === 401 || res.status === 404) {
      setQueue([])
      return
    }
    if (!res.ok) {
      setQueue([])
      return
    }
    const data = await res.json()
    const list = (data.announcements || []) as Announcement[]
    setQueue(list)
  }, [])

  useEffect(() => {
    void loadPending().finally(() => setLoading(false))
  }, [loadPending])

  useEffect(() => {
    if (!loading && queue.length > 0) {
      setOpen(true)
    }
    if (queue.length === 0) {
      setOpen(false)
    }
  }, [loading, queue.length])

  const current = queue[0]

  const handleOk = async () => {
    if (!current || dismissing) return
    setDismissing(true)
    try {
      const res = await fetch("/api/cabinet/announcements/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ announcementId: current.id }),
      })
      if (res.ok) {
        setQueue((q) => q.slice(1))
      }
    } finally {
      setDismissing(false)
    }
  }

  if (!current) return null

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        key={current.id}
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>{current.title}</DialogTitle>
          <DialogDescription asChild>
            <AnnouncementBody
              body={current.body}
              className="text-left pt-2 text-sm text-foreground"
            />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => void handleOk()} disabled={dismissing}>
            Ок
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
