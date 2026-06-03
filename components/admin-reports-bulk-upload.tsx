"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

export type BulkUploadCabinetUser = {
  id: string
  email: string
  artistName: string | null
}

type PreviewItemResponse = {
  tempFileId: string
  fileName: string
  artistFromFile: string
  amountRub: number | null
  amountUsd: number | null
  amountEur: number | null
  rowCount: number
  suggestedUserId: string | null
  requiresManual: boolean
  matchConfidence: string
  candidateUserIds: string[]
  warnings: string[]
  ok: boolean
  error?: string
}

type BulkRow = {
  tempFileId: string
  fileName: string
  artistFromFile: string
  amountRub: number | null
  amountUsd: number | null
  amountEur: number | null
  rowCount: number
  userId: string
  amount: string
  requiresManual: boolean
  candidateUserIds: string[]
  warnings: string[]
  ok: boolean
  parseError?: string
}

function artistSortKey(user: BulkUploadCabinetUser): string {
  const name = user.artistName?.trim()
  if (name) return name.toLocaleLowerCase("ru-RU")
  return `\uFFFF${user.email.toLowerCase()}`
}

function artistOptionLabel(user: BulkUploadCabinetUser): string {
  const name = user.artistName?.trim()
  return name ? `${name} · ${user.email}` : `Без имени артиста · ${user.email}`
}

function previewToRow(item: PreviewItemResponse): BulkRow {
  const amount =
    item.amountRub != null && !Number.isNaN(item.amountRub)
      ? String(Math.round(item.amountRub * 100) / 100)
      : ""
  return {
    tempFileId: item.tempFileId,
    fileName: item.fileName,
    artistFromFile: item.artistFromFile,
    amountRub: item.amountRub,
    amountUsd: item.amountUsd,
    amountEur: item.amountEur,
    rowCount: item.rowCount,
    userId: item.ok && !item.requiresManual && item.suggestedUserId ? item.suggestedUserId : "",
    amount,
    requiresManual: item.requiresManual,
    candidateUserIds: item.candidateUserIds,
    warnings: item.warnings,
    ok: item.ok,
    parseError: item.error,
  }
}

type AdminReportsBulkUploadProps = {
  users: BulkUploadCabinetUser[]
  onCommitted: () => void
}

export function AdminReportsBulkUpload({ users, onCommitted }: AdminReportsBulkUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [commitLoading, setCommitLoading] = useState(false)
  const [rows, setRows] = useState<BulkRow[]>([])

  const usersSorted = useMemo(
    () =>
      [...users].sort((a, b) => {
        const c = artistSortKey(a).localeCompare(artistSortKey(b), "ru-RU")
        return c !== 0 ? c : a.email.localeCompare(b.email, "ru-RU")
      }),
    [users],
  )

  const processFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase()
      return ext === "csv" || ext === "xlsx"
    })

    if (files.length === 0) {
      toast.error("Выберите файлы .csv или .xlsx")
      return
    }

    if (files.length > 50) {
      toast.error("Максимум 50 файлов за раз")
      return
    }

    setPreviewLoading(true)
    try {
      const formData = new FormData()
      for (const f of files) formData.append("files", f)

      const response = await fetch("/api/admin/reports/bulk/preview", {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      const data = (await response.json().catch(() => null)) as {
        items?: PreviewItemResponse[]
        error?: string
      } | null

      if (!response.ok) {
        toast.error(data?.error || "Не удалось обработать файлы")
        return
      }

      const newRows = (data?.items ?? []).map(previewToRow)
      setRows((prev) => {
        const byName = new Map(prev.map((r) => [r.fileName.toLowerCase(), r]))
        for (const row of newRows) {
          byName.set(row.fileName.toLowerCase(), row)
        }
        return Array.from(byName.values())
      })

      const failed = newRows.filter((r) => !r.ok).length
      if (failed > 0) {
        toast.warning(`Обработано: ${newRows.length - failed}, с ошибками: ${failed}`)
      } else {
        toast.success(`Добавлено в таблицу: ${newRows.length}`)
      }
    } catch (e) {
      console.error(e)
      toast.error("Ошибка загрузки")
    } finally {
      setPreviewLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length) void processFiles(e.dataTransfer.files)
    },
    [processFiles],
  )

  const updateRow = (tempFileId: string, patch: Partial<BulkRow>) => {
    setRows((prev) => prev.map((r) => (r.tempFileId === tempFileId ? { ...r, ...patch } : r)))
  }

  const validRows = rows.filter((r) => r.ok && r.tempFileId)
  const readyRows = validRows.filter((r) => {
    const amount = parseFloat(r.amount)
    return r.userId && !Number.isNaN(amount) && amount > 0
  })

  const totalReadyRub = readyRows.reduce((sum, r) => sum + parseFloat(r.amount), 0)

  const canCommit = readyRows.length > 0 && readyRows.length === validRows.length

  const handleCommit = async () => {
    if (!canCommit) {
      toast.error("Заполните пользователя и сумму (RUB) для всех файлов")
      return
    }

    setCommitLoading(true)
    try {
      const items = readyRows.map((r) => ({
        tempFileId: r.tempFileId,
        userId: r.userId,
        amount: parseFloat(r.amount),
      }))

      const response = await fetch("/api/admin/reports/bulk/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items }),
      })

      const data = (await response.json().catch(() => null)) as {
        ok?: boolean
        results?: Array<{ tempFileId: string; ok: boolean; error?: string }>
        error?: string
      } | null

      if (!response.ok) {
        toast.error(data?.error || "Не удалось загрузить отчёты")
        return
      }

      const failed = (data?.results ?? []).filter((r) => !r.ok)
      if (failed.length > 0) {
        toast.error(`Ошибок: ${failed.length}. Успешно: ${(data?.results ?? []).length - failed.length}`)
      } else {
        toast.success(`Загружено отчётов: ${readyRows.length}`)
        setRows([])
        onCommitted()
      }
    } catch (e) {
      console.error(e)
      toast.error("Ошибка при загрузке в кабинеты")
    } finally {
      setCommitLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50",
          previewLoading && "pointer-events-none opacity-60",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void processFiles(e.target.files)
          }}
        />
        {previewLoading ? (
          <Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        )}
        <p className="font-medium">Перетащите файлы отчётов сюда</p>
        <p className="text-sm text-muted-foreground mt-1">
          или нажмите для выбора · .csv и .xlsx · до 50 файлов
        </p>
      </div>

      {rows.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Файлов: {rows.length} · готово к загрузке: {readyRows.length}
              {readyRows.length > 0 ? (
                <> · сумма RUB: {totalReadyRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })}</>
              ) : null}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setRows([])} disabled={commitLoading}>
                Очистить
              </Button>
              <Button type="button" onClick={() => void handleCommit()} disabled={!canCommit || commitLoading}>
                {commitLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Загрузка…
                  </>
                ) : (
                  `Загрузить в кабинеты (${readyRows.length})`
                )}
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Файл</TableHead>
                  <TableHead>Артист (из файла)</TableHead>
                  <TableHead>Пользователь ЛК</TableHead>
                  <TableHead className="text-right">Сумма RUB</TableHead>
                  <TableHead className="text-right">Строк</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const amountNum = parseFloat(row.amount)
                  const rowReady =
                    row.ok &&
                    row.tempFileId &&
                    row.userId &&
                    !Number.isNaN(amountNum) &&
                    amountNum > 0

                  const candidateUsers =
                    row.candidateUserIds?.length > 0
                      ? usersSorted.filter((u) => row.candidateUserIds.includes(u.id))
                      : usersSorted

                  return (
                    <TableRow key={row.tempFileId || row.fileName} className={!row.ok ? "bg-destructive/5" : undefined}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={row.fileName}>
                        {row.fileName}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate" title={row.artistFromFile}>
                        {row.artistFromFile || "—"}
                      </TableCell>
                      <TableCell className="min-w-[240px]">
                        {!row.ok ? (
                          <span className="text-sm text-destructive">{row.parseError || "Ошибка"}</span>
                        ) : (
                          <Select
                            value={row.userId || undefined}
                            onValueChange={(v) => updateRow(row.tempFileId, { userId: v })}
                            disabled={commitLoading}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Выберите пользователя" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[min(20rem,60vh)]">
                              {candidateUsers.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {artistOptionLabel(user)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.ok ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="w-28 ml-auto text-right"
                            value={row.amount}
                            onChange={(e) => updateRow(row.tempFileId, { amount: e.target.value })}
                            disabled={commitLoading}
                          />
                        ) : (
                          "—"
                        )}
                        {row.ok && (row.amountUsd != null || row.amountEur != null) ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            {row.amountUsd != null ? `USD ${row.amountUsd}` : ""}
                            {row.amountUsd != null && row.amountEur != null ? " · " : ""}
                            {row.amountEur != null ? `EUR ${row.amountEur}` : ""}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.ok ? row.rowCount : "—"}</TableCell>
                      <TableCell>
                        {row.ok ? (
                          rowReady ? (
                            <span className="inline-flex items-center gap-1 text-sm text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              Готов
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-sm text-amber-600">
                              <AlertCircle className="h-4 w-4" />
                              {row.requiresManual && !row.userId ? "Выберите вручную" : "Укажите сумму"}
                            </span>
                          )
                        ) : (
                          <span className="text-sm text-destructive">Ошибка</span>
                        )}
                        {row.warnings.length > 0 ? (
                          <ul className="text-xs text-muted-foreground mt-1 list-disc pl-4 max-w-[220px]">
                            {row.warnings.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      ) : null}
    </div>
  )
}
