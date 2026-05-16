"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type UploadDraft = {
  id: string
  userId: string
  kind: "single" | "album"
  status: string
  payload: Record<string, unknown>
  audioRelPath?: string
  expiresAt: string
}

function getDraftDisplayName(draft: UploadDraft): string {
  const artist = `${draft.payload.artistName ?? draft.payload.albumArtistName ?? ""}`.trim()
  const track = `${draft.payload.trackName ?? draft.payload.albumTitle ?? ""}`.trim()
  if (artist && track) return `${artist} - ${track}`
  if (track) return track
  return draft.id
}

export default function AdminUploadDraftsPage() {
  const [drafts, setDrafts] = useState<UploadDraft[]>([])
  const [selected, setSelected] = useState<UploadDraft | null>(null)
  const [payloadText, setPayloadText] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/upload-drafts", { credentials: "include" })
      if (!res.ok) return
      const data = await res.json()
      setDrafts((data.drafts ?? []) as UploadDraft[])
    })()
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold">Черновики загрузки</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded border p-3 space-y-2 max-h-[70vh] overflow-auto">
          {drafts.map((d) => (
            <div key={d.id} className="border rounded p-2 space-y-2">
              <button
                type="button"
                className="w-full text-left hover:bg-muted rounded p-1 -m-1"
                onClick={() => {
                  setSelected(d)
                  setPayloadText(JSON.stringify(d.payload, null, 2))
                }}
              >
                <p className="text-sm font-medium">{getDraftDisplayName(d)}</p>
                <p className="text-xs text-muted-foreground">{d.userId}</p>
                <p className="text-xs">{d.kind} / {d.status}</p>
              </button>
              {d.audioRelPath ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(`/api/admin/upload-drafts/${encodeURIComponent(d.id)}/audio`, "_blank")
                  }}
                >
                  Скачать WAV
                </Button>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deletingId === d.id}
                onClick={async () => {
                  if (!window.confirm("Удалить этот черновик? Действие нельзя отменить.")) return
                  setDeletingId(d.id)
                  try {
                    const res = await fetch(`/api/admin/upload-drafts/${encodeURIComponent(d.id)}`, {
                      method: "DELETE",
                      credentials: "include",
                    })
                    if (!res.ok) return
                    setDrafts((prev) => prev.filter((item) => item.id !== d.id))
                    if (selected?.id === d.id) {
                      setSelected(null)
                      setPayloadText("")
                    }
                  } finally {
                    setDeletingId((current) => (current === d.id ? null : current))
                  }
                }}
              >
                {deletingId === d.id ? "Удаляем..." : "Удалить"}
              </Button>
            </div>
          ))}
        </div>
        <div className="rounded border p-3 space-y-3">
          {selected ? (
            <>
              <Input value={selected.status} onChange={(e) => setSelected({ ...selected, status: e.target.value })} />
              <Textarea rows={18} value={payloadText} onChange={(e) => setPayloadText(e.target.value)} />
              <Button
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true)
                  try {
                    const payload = JSON.parse(payloadText)
                    const res = await fetch(`/api/admin/upload-drafts/${selected.id}`, {
                      method: "PATCH",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: selected.status, payload }),
                    })
                    if (!res.ok) return
                    const data = await res.json()
                    setSelected(data.draft as UploadDraft)
                  } finally {
                    setIsSaving(false)
                  }
                }}
              >
                Сохранить
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Выберите черновик слева.</p>
          )}
        </div>
      </div>
    </div>
  )
}
