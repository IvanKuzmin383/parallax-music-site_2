"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { format, parseISO } from "date-fns"
import { ru } from "date-fns/locale"
import {
  Eye,
  Download,
  Image as ImageIcon,
  Trash2,
  Link2,
  Copy,
  Save,
  FileCheck,
  CalendarIcon,
  Users,
  Info,
} from "lucide-react"
import { AdminSectionNav } from "@/components/admin-section-nav"
import type { Track, TrackStatus } from "@/lib/tracks"
import type { UploadAddonBundleItem } from "@/lib/orders"
import { formatUploadAddonBundleLine } from "@/lib/upload-addon-bundle-display"
import ruMessages from "@/messages/ru.json"
import type { UploadDraft, UploadDraftPayload, UploadDraftStatus } from "@/lib/upload-drafts"
import type { PlatformLinks } from "@/lib/smartlink-platforms"
import { SMARTLINK_PLATFORMS } from "@/lib/smartlink-platforms"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  AI_COVER_REQUEST_PRICE_RUB,
  GENRES,
  TRACK_MOODS,
  musicRightsRequiresAiService,
} from "@/lib/track-constants"
import { cn } from "@/lib/utils"
import { DEFAULT_RELEASE_LABEL_NAME } from "@/lib/release-label"
import { fetchAdminTracksAllMatching } from "@/lib/admin-tracks-fetch"
import {
  ADMIN_TRACKS_CLIENT_CAP,
  type AdminTracksListQuery,
} from "@/lib/admin-tracks-query-shared"

const STATUS_OPTIONS: { value: TrackStatus; label: string }[] = [
  { value: "upload_pending", label: "Черновик (доработка пользователем)" },
  { value: "on_moderation", label: "На модерации" },
  { value: "sent_to_platforms", label: "Модерация стриминг-сервисами" },
  { value: "approved_by_platforms", label: "Одобрен площадками" },
  { value: "released", label: "Выпущен" },
  { value: "rejected", label: "Отклонено" },
  { value: "postponed", label: "Отложено" },
]

type StatusFilter = TrackStatus | "all"
type TrackListSortField = "releaseDate" | "createdAt"
type AdminAlbum = {
  id: string
  title: string
  artistName: string
}

const MUSIC_RIGHTS_OPTIONS = [
  "Музыка написана мной. Есть проект",
  "Сгенерирована в ИИ (платно)",
  "Сгенерирована в ИИ (бесплатно)",
  "Купил музыку. Есть договор/чек",
  "Скачал в интернете бесплатно",
] as const
const LYRICS_RIGHTS_OPTIONS = [
  "Являюсь автором текста",
  "Является общественным достоянием",
  "Текст сгенерирован ИИ",
  "Купил текст. Есть договор/чек",
  "Скачал в интернете бесплатно",
] as const
const PERFORMANCE_RIGHTS_OPTIONS = [
  "Являюсь исполнителем песни",
  "Исполнитель ИИ",
  "Исполнитель другой человек. Являюсь правообладалетелем",
] as const

const genreKeys = [...GENRES]
const moodKeys = [...TRACK_MOODS]
const RIGHTS_EMPTY = "__rights_empty__"

const UPLOAD_DRAFT_STATUS_OPTIONS: { value: UploadDraftStatus; label: string }[] = [
  { value: "collecting", label: "Сбор данных" },
  { value: "awaiting_payment", label: "Ожидает оплаты" },
  { value: "paid", label: "Оплачено" },
  { value: "finalized", label: "Финализирован" },
  { value: "expired", label: "Истёк" },
  { value: "cancelled", label: "Отменён" },
]

/** Сколько строк показывать в «Простом списке» до нажатия «Еще». */
const SIMPLE_LIST_PAGE_SIZE = 15

function uploadDraftMediaEditable(d: UploadDraft): boolean {
  return d.status === "collecting" || d.status === "awaiting_payment" || d.status === "paid"
}

function transferDistributorValidationError(d: TrackDraft): string | null {
  if (!d.transferFromOtherDistributor) return null
  if (!d.upc.trim() || !d.isrc.trim()) {
    return "При переносе с другого дистрибьютора укажите UPC и ISRC"
  }
  return null
}

function uploadDraftToTrackDraft(d: UploadDraft): TrackDraft {
  const p = d.payload
  const genreRaw = `${p.genre ?? ""}`.trim()
  const genre =
    genreRaw && GENRES.includes(genreRaw as (typeof GENRES)[number])
      ? genreRaw
      : genreRaw || "Other"
  let releaseDateStr = ""
  const rd = p.releaseDate
  if (typeof rd === "string" && /^\d{4}-\d{2}-\d{2}/.test(rd)) {
    releaseDateStr = rd.slice(0, 10)
  }
  return {
    trackName: `${p.trackName ?? ""}`.trim(),
    artistName: `${p.artistName ?? ""}`.trim(),
    labelName: getReleaseLabelName(p.labelName),
    userId: d.userId,
    genre,
    mood: `${p.mood ?? ""}`.trim(),
    shortDescription: `${p.shortDescription ?? ""}`,
    lyricsText: `${p.lyricsText ?? ""}`,
    musicAuthor: `${p.musicAuthor ?? ""}`,
    lyricsAuthor: `${p.lyricsAuthor ?? ""}`,
    backingAuthor: `${p.backingAuthor ?? ""}`,
    musicRights: `${p.musicRights ?? ""}`,
    musicAiService: `${p.musicAiService ?? ""}`,
    lyricsRights: `${p.lyricsRights ?? ""}`,
    performanceRights: `${p.performanceRights ?? ""}`,
    isInstrumental: Boolean(p.isInstrumental),
    status: "on_moderation",
    releaseDate: releaseDateStr,
    transferFromOtherDistributor: Boolean(p.transferFromOtherDistributor),
    upc: `${p.transferUpc ?? ""}`,
    isrc: `${p.transferIsrc ?? ""}`,
    moderationNote: "",
    albumId: d.albumId ?? "__none__",
    platformLinks: {},
    smartlinkSlug: "",
  }
}

function buildUploadDraftPayloadFromEditor(draft: UploadDraft, d: TrackDraft): UploadDraftPayload {
  const prev = draft.payload
  const genreTrim = d.genre.trim()
  return {
    ...prev,
    trackName: d.trackName.trim(),
    artistName: d.artistName.trim(),
    labelName: d.labelName.trim() || undefined,
    genre: genreTrim || prev.genre || "Other",
    mood: d.mood.trim() || prev.mood,
    shortDescription: d.shortDescription,
    lyricsText: d.lyricsText,
    lyricsAuthor: d.lyricsAuthor,
    musicAuthor: d.musicAuthor,
    backingAuthor: d.backingAuthor,
    musicRights: d.musicRights,
    musicAiService: d.musicAiService,
    lyricsRights: d.lyricsRights,
    performanceRights: d.performanceRights,
    isInstrumental: d.isInstrumental,
    releaseDate: d.releaseDate.trim() === "" ? undefined : d.releaseDate.trim(),
    requestAiCover: prev.requestAiCover,
    transferFromOtherDistributor: d.transferFromOtherDistributor,
    transferUpc: d.transferFromOtherDistributor ? d.upc.trim() : "",
    transferIsrc: d.transferFromOtherDistributor ? d.isrc.trim() : "",
    addons: prev.addons ?? {},
  }
}

/** Порядок загрузки: раньше создан - выше в списке. */
function sortTracksByUploadOrder(tracks: Track[]): Track[] {
  return [...tracks].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}

function ruTracksCountLabel(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return `${n} трек`
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return `${n} трека`
  return `${n} треков`
}

function getReleaseLabelName(labelName?: string | null): string {
  const trimmed = typeof labelName === "string" ? labelName.trim() : ""
  return trimmed || DEFAULT_RELEASE_LABEL_NAME
}

type TrackDraft = {
  trackName: string
  artistName: string
  labelName: string
  /** Email владельца (как в cabinet_users / user_id трека) */
  userId: string
  genre: string
  mood: string
  shortDescription: string
  lyricsText: string
  musicAuthor: string
  lyricsAuthor: string
  backingAuthor: string
  musicRights: string
  musicAiService: string
  lyricsRights: string
  performanceRights: string
  isInstrumental: boolean
  status: TrackStatus
  releaseDate: string
  transferFromOtherDistributor: boolean
  upc: string
  isrc: string
  moderationNote: string
  albumId: string
  platformLinks: PlatformLinks
  smartlinkSlug: string
}

function trackToDraft(t: Track): TrackDraft {
  let releaseDateStr = ""
  if (t.releaseDate) {
    const d = new Date(t.releaseDate)
    if (!Number.isNaN(d.getTime())) {
      releaseDateStr = format(d, "yyyy-MM-dd")
    } else if (/^\d{4}-\d{2}-\d{2}/.test(t.releaseDate)) {
      releaseDateStr = t.releaseDate.slice(0, 10)
    }
  }
  return {
    trackName: t.trackName,
    artistName: t.artistName,
    labelName: getReleaseLabelName(t.labelName),
    userId: t.userId,
    genre: t.genre,
    mood: t.mood || "",
    shortDescription: t.shortDescription ?? "",
    lyricsText: t.lyricsText ?? "",
    musicAuthor: t.musicAuthor ?? "",
    lyricsAuthor: t.lyricsAuthor ?? "",
    backingAuthor: t.backingAuthor ?? "",
    musicRights: t.musicRights ?? "",
    musicAiService: t.musicAiService ?? "",
    lyricsRights: t.lyricsRights ?? "",
    performanceRights: t.performanceRights ?? "",
    isInstrumental: t.isInstrumental,
    status: t.status,
    releaseDate: releaseDateStr,
    transferFromOtherDistributor: Boolean(t.transferFromOtherDistributor),
    upc: t.upc ?? "",
    isrc: t.isrc ?? "",
    moderationNote: t.moderationNote ?? "",
    albumId: t.albumId ?? "__none__",
    platformLinks: { ...(t.platformLinks ?? {}) },
    smartlinkSlug: t.smartlinkSlug ?? "",
  }
}

export default function TracksPageClient() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [tracksTotal, setTracksTotal] = useState(0)
  const [tracksTotalInDb, setTracksTotalInDb] = useState(0)
  const [tracksTruncated, setTracksTruncated] = useState(false)
  const [albums, setAlbums] = useState<AdminAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [trackToDelete, setTrackToDelete] = useState<Track | null>(null)
  const [deleteUploadDraftDialogOpen, setDeleteUploadDraftDialogOpen] = useState(false)
  const [uploadDraftToDelete, setUploadDraftToDelete] = useState<UploadDraft | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [releaseDateFromDraft, setReleaseDateFromDraft] = useState("")
  const [releaseDateToDraft, setReleaseDateToDraft] = useState("")
  const [releaseDateFromApplied, setReleaseDateFromApplied] = useState("")
  const [releaseDateToApplied, setReleaseDateToApplied] = useState("")
  const [expandedArtist, setExpandedArtist] = useState<string | null>(null)
  const [trackListSortField, setTrackListSortField] = useState<TrackListSortField>("releaseDate")
  const [trackListSortDirection, setTrackListSortDirection] = useState<"asc" | "desc">("asc")
  const [simpleListVisibleCount, setSimpleListVisibleCount] = useState(SIMPLE_LIST_PAGE_SIZE)
  const [trackDraft, setTrackDraft] = useState<TrackDraft | null>(null)
  const [uploadDrafts, setUploadDrafts] = useState<UploadDraft[]>([])
  const [selectedUploadDraft, setSelectedUploadDraft] = useState<UploadDraft | null>(null)
  const [uploadDraftRowStatus, setUploadDraftRowStatus] = useState<UploadDraftStatus>("collecting")
  const [updatingDraftId, setUpdatingDraftId] = useState<string | null>(null)
  const [savingTrackId, setSavingTrackId] = useState<string | null>(null)
  const [finalizingDraftId, setFinalizingDraftId] = useState<string | null>(null)
  /** Позиции оплаченного пакета допов с загрузки (для баннера в карточке трека). */
  const [trackEditBundleAddons, setTrackEditBundleAddons] = useState<UploadAddonBundleItem[]>([])
  const [trackEditBundleAddonsFetched, setTrackEditBundleAddonsFetched] = useState(false)
  const [uploadingCoverId, setUploadingCoverId] = useState<string | null>(null)
  const [uploadingDraftCoverId, setUploadingDraftCoverId] = useState<string | null>(null)
  const [uploadingDraftAudioId, setUploadingDraftAudioId] = useState<string | null>(null)
  const [coverFileInputKey, setCoverFileInputKey] = useState(0)
  const [draftCoverFileInputKey, setDraftCoverFileInputKey] = useState(0)
  const [draftAudioFileInputKey, setDraftAudioFileInputKey] = useState(0)
  const [coverRefreshKey, setCoverRefreshKey] = useState<Record<string, number>>({})
  const [upcomingExpanded, setUpcomingExpanded] = useState(false)
  const [uploadDraftsSectionExpanded, setUploadDraftsSectionExpanded] = useState(false)
  const [albumBulkOpen, setAlbumBulkOpen] = useState(false)
  const [albumBulkAlbumId, setAlbumBulkAlbumId] = useState<string | null>(null)
  const [albumBulkTrackCount, setAlbumBulkTrackCount] = useState(0)
  const [albumBulkUpc, setAlbumBulkUpc] = useState("")
  const [albumBulkPlatformLinks, setAlbumBulkPlatformLinks] = useState<PlatformLinks>({})
  const [albumBulkSaving, setAlbumBulkSaving] = useState(false)
  const [albumModOpen, setAlbumModOpen] = useState(false)
  const [albumModAlbumId, setAlbumModAlbumId] = useState<string | null>(null)
  const [albumModTrackCount, setAlbumModTrackCount] = useState(0)
  /** "__keep__" - не менять статус */
  const [albumModStatus, setAlbumModStatus] = useState<string>("__keep__")
  const [albumModNote, setAlbumModNote] = useState("")
  const [albumModSaving, setAlbumModSaving] = useState(false)
  const [albumModClearOpen, setAlbumModClearOpen] = useState(false)
  const [downloadingAlbumId, setDownloadingAlbumId] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const userIdFilterRaw = searchParams.get("userId")?.trim() ?? ""
  const userIdFilterNorm = userIdFilterRaw ? userIdFilterRaw.toLowerCase() : ""
  const filterUserLabel = searchParams.get("label")?.trim() ?? ""

  const resetTrackListFilters = useCallback(() => {
    setStatusFilter("all")
    setReleaseDateFromDraft("")
    setReleaseDateToDraft("")
    setReleaseDateFromApplied("")
    setReleaseDateToApplied("")
    router.replace("/admin26081993/tracks")
  }, [router])

  /** Фильтры применяются на сервере; локальный список уже отфильтрован. */
  const statusFilteredTracks = tracks
  const releaseDateFilteredTracks = tracks

  const adminTracksQuery = useMemo((): Omit<AdminTracksListQuery, "limit" | "offset"> => ({
    userId: userIdFilterNorm || undefined,
    status: statusFilter,
    releaseDateFrom: releaseDateFromApplied || undefined,
    releaseDateTo: releaseDateToApplied || undefined,
    sortField: trackListSortField,
    sortDirection: trackListSortDirection,
  }), [
    userIdFilterNorm,
    statusFilter,
    releaseDateFromApplied,
    releaseDateToApplied,
    trackListSortField,
    trackListSortDirection,
  ])

  const refreshTracks = useCallback(async () => {
    try {
      const data = await fetchAdminTracksAllMatching(adminTracksQuery)
      setTracks(data.tracks)
      setTracksTotal(data.total)
      setTracksTotalInDb(data.totalInDatabase)
      setTracksTruncated(data.truncated)
      setAlbums(
        data.albums.map((a) => ({
          id: a.id,
          title: a.title,
          artistName: a.artistName,
        }))
      )
      setUploadDrafts(data.uploadDrafts as UploadDraft[])
      setIsAuthenticated(true)
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 401) setIsAuthenticated(false)
    }
  }, [adminTracksQuery])

  const trackAlbumTitleById = useMemo(() => {
    return albums.reduce<Record<string, string>>((acc, album) => {
      acc[album.id] = album.title
      return acc
    }, {})
  }, [albums])

  const simpleListTracks = useMemo(() => {
    const list = [...statusFilteredTracks]
    const getTrackDate = (track: Track) => {
      if (trackListSortField === "createdAt") return new Date(track.createdAt).getTime()
      const publicationDate = track.releaseDate || track.createdAt
      return new Date(publicationDate).getTime()
    }
    list.sort((a, b) => {
      const aDate = getTrackDate(a)
      const bDate = getTrackDate(b)
      return trackListSortDirection === "asc" ? aDate - bDate : bDate - aDate
    })
    return list
  }, [statusFilteredTracks, trackListSortField, trackListSortDirection])

  const simpleListTracksVisible = useMemo(
    () => simpleListTracks.slice(0, simpleListVisibleCount),
    [simpleListTracks, simpleListVisibleCount]
  )
  const simpleListHasMore = simpleListTracks.length > simpleListVisibleCount

  useEffect(() => {
    setSimpleListVisibleCount(SIMPLE_LIST_PAGE_SIZE)
  }, [adminTracksQuery])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      await refreshTracks()
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [refreshTracks])

  const displayUploadDrafts = useMemo(() => {
    let list = uploadDrafts
    if (userIdFilterNorm) {
      list = list.filter((d) => d.userId.toLowerCase() === userIdFilterNorm)
    }
    const tier = (s: string) => {
      if (s === "collecting" || s === "awaiting_payment" || s === "paid") return 0
      if (s === "expired" || s === "cancelled") return 1
      return 2
    }
    return [...list].sort((a, b) => {
      const ta = tier(a.status)
      const tb = tier(b.status)
      if (ta !== tb) return ta - tb
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
  }, [uploadDrafts, userIdFilterNorm])

  const showUploadDraftsInModeration =
    statusFilter === "all" || statusFilter === "on_moderation"

  useEffect(() => {
    if (!isDialogOpen || !selectedTrack) {
      setTrackEditBundleAddons([])
      setTrackEditBundleAddonsFetched(false)
      return
    }
    setTrackEditBundleAddons([])
    setTrackEditBundleAddonsFetched(false)
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/tracks/${encodeURIComponent(selectedTrack.id)}/ordered-addons`,
          { credentials: "include" }
        )
        const data = (await res.json().catch(() => ({}))) as { bundleItems?: UploadAddonBundleItem[] }
        if (!cancelled) {
          setTrackEditBundleAddons(res.ok ? (data.bundleItems ?? []) : [])
          setTrackEditBundleAddonsFetched(true)
        }
      } catch {
        if (!cancelled) {
          setTrackEditBundleAddons([])
          setTrackEditBundleAddonsFetched(true)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isDialogOpen, selectedTrack?.id])

  const loadTracks = async () => {
    await refreshTracks()
  }

  useEffect(() => {
    if (!userIdFilterNorm) return
    const subset = tracks.filter(
      (t) => t.userId.toLowerCase() === userIdFilterNorm
    )
    if (subset.length === 0) return
    const keys = [
      ...new Set(
        subset.map((t) => t.artistName?.trim() || "Без имени артиста")
      ),
    ].sort((a, b) => a.localeCompare(b))
    if (keys[0]) setExpandedArtist(keys[0])
  }, [userIdFilterNorm, tracks])

  const handleStatusChange = async (trackId: string, status: TrackStatus) => {
    setUpdatingId(trackId)
    try {
      const response = await fetch(`/api/admin/tracks/${trackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      })
      if (response.ok) {
        toast.success("Статус обновлён")
        loadTracks()
      } else {
        toast.error("Не удалось обновить статус")
      }
    } catch (error) {
      toast.error("Ошибка при обновлении")
    } finally {
      setUpdatingId(null)
    }
  }

  const handleViewDetails = (track: Track) => {
    setSelectedUploadDraft(null)
    setSelectedTrack(track)
    setTrackDraft(trackToDraft(track))
    setIsDialogOpen(true)
  }

  const handleViewUploadDraft = (draft: UploadDraft) => {
    setSelectedTrack(null)
    setSelectedUploadDraft(draft)
    setUploadDraftRowStatus(draft.status)
    setTrackDraft(uploadDraftToTrackDraft(draft))
    setIsDialogOpen(true)
  }

  const handleUploadDraftStatusChange = async (draftId: string, status: UploadDraftStatus) => {
    setUpdatingDraftId(draftId)
    try {
      const response = await fetch(`/api/admin/upload-drafts/${encodeURIComponent(draftId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      })
      if (response.ok) {
        toast.success("Статус черновика обновлён")
        loadTracks()
      } else {
        toast.error("Не удалось обновить статус черновика")
      }
    } catch {
      toast.error("Ошибка при обновлении")
    } finally {
      setUpdatingDraftId(null)
    }
  }

  const handleFinalizeUploadDraft = async () => {
    if (!selectedUploadDraft || !trackDraft) return
    const tn = trackDraft.trackName.trim()
    const an = trackDraft.artistName.trim()
    if (!tn || !an) {
      toast.error("Укажите название трека и исполнителя")
      return
    }
    const xferErr = transferDistributorValidationError(trackDraft)
    if (xferErr) {
      toast.error(xferErr)
      return
    }
    if (selectedUploadDraft.status === "finalized") {
      toast.error("Черновик уже финализирован")
      return
    }
    setFinalizingDraftId(selectedUploadDraft.id)
    try {
      const payload = buildUploadDraftPayloadFromEditor(selectedUploadDraft, trackDraft)
      const response = await fetch(
        `/api/admin/upload-drafts/${encodeURIComponent(selectedUploadDraft.id)}/finalize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ payload }),
        }
      )
      if (response.ok) {
        toast.success("Трек создан и отправлен на модерацию")
        setIsDialogOpen(false)
        setSelectedUploadDraft(null)
        setTrackDraft(null)
        loadTracks()
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? "Не удалось финализировать черновик")
      }
    } catch {
      toast.error("Ошибка при финализации")
    } finally {
      setFinalizingDraftId(null)
    }
  }

  const handleSaveUploadDraft = async () => {
    if (!selectedUploadDraft || !trackDraft) return
    const tn = trackDraft.trackName.trim()
    const an = trackDraft.artistName.trim()
    if (!tn || !an) {
      toast.error("Укажите название трека и исполнителя")
      return
    }
    const xferSaveErr = transferDistributorValidationError(trackDraft)
    if (xferSaveErr) {
      toast.error(xferSaveErr)
      return
    }
    setSavingTrackId(selectedUploadDraft.id)
    try {
      const payload = buildUploadDraftPayloadFromEditor(selectedUploadDraft, trackDraft)
      const response = await fetch(
        `/api/admin/upload-drafts/${encodeURIComponent(selectedUploadDraft.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ payload, status: uploadDraftRowStatus }),
          credentials: "include",
        }
      )
      if (response.ok) {
        toast.success("Черновик сохранён")
        const data = (await response.json()) as { draft?: UploadDraft }
        if (data.draft) {
          setSelectedUploadDraft(data.draft)
          setUploadDraftRowStatus(data.draft.status)
          setTrackDraft(uploadDraftToTrackDraft(data.draft))
        }
        loadTracks()
      } else {
        const err = await response.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? "Не удалось сохранить черновик")
      }
    } catch {
      toast.error("Ошибка при сохранении")
    } finally {
      setSavingTrackId(null)
    }
  }

  const handleDownloadUploadDraftAudio = async (
    draftId: string,
    trackName: string,
    artistName?: string
  ) => {
    try {
      const response = await fetch(`/api/admin/upload-drafts/${encodeURIComponent(draftId)}/audio`, {
        credentials: "include",
      })
      if (!response.ok) {
        toast.error("Не удалось скачать аудио черновика")
        return
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${safeFilename(artistName ?? "")} - ${safeFilename(trackName)}.wav`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Аудио скачано")
    } catch {
      toast.error("Ошибка при скачивании")
    }
  }

  const handleDownloadUploadDraftCover = async (
    draftId: string,
    trackName: string,
    artistName?: string
  ) => {
    try {
      const response = await fetch(`/api/admin/upload-drafts/${encodeURIComponent(draftId)}/cover`, {
        credentials: "include",
      })
      if (!response.ok) {
        toast.error("Не удалось скачать обложку черновика")
        return
      }
      const ext = response.headers.get("content-type")?.includes("png") ? "png" : "jpg"
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${safeFilename(artistName ?? "")} - ${safeFilename(trackName)}.${ext}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Обложка скачана")
    } catch {
      toast.error("Ошибка при скачивании")
    }
  }

  const handleSaveTrackCard = async () => {
    if (!selectedTrack || !trackDraft) return
    const tn = trackDraft.trackName.trim()
    const an = trackDraft.artistName.trim()
    const ownerEmail = trackDraft.userId.trim()
    if (!tn || !an) {
      toast.error("Укажите название трека и исполнителя")
      return
    }
    if (!ownerEmail) {
      toast.error("Укажите email пользователя-владельца трека")
      return
    }
    const xferTrackErr = transferDistributorValidationError(trackDraft)
    if (xferTrackErr) {
      toast.error(xferTrackErr)
      return
    }
    setSavingTrackId(selectedTrack.id)
    try {
      const body = {
        trackName: tn,
        artistName: an,
        labelName: trackDraft.labelName.trim() || DEFAULT_RELEASE_LABEL_NAME,
        userId: ownerEmail,
        genre: trackDraft.genre.trim() || "Other",
        mood: trackDraft.mood.trim() === "" ? null : trackDraft.mood,
        shortDescription: trackDraft.shortDescription,
        lyricsText: trackDraft.lyricsText,
        musicAuthor: trackDraft.musicAuthor,
        lyricsAuthor: trackDraft.lyricsAuthor,
        backingAuthor: trackDraft.backingAuthor,
        musicRights: trackDraft.musicRights,
        musicAiService: trackDraft.musicAiService,
        lyricsRights: trackDraft.lyricsRights,
        performanceRights: trackDraft.performanceRights,
        isInstrumental: trackDraft.isInstrumental,
        status: trackDraft.status,
        releaseDate: trackDraft.releaseDate.trim() === "" ? null : trackDraft.releaseDate.trim(),
        upc: trackDraft.upc.trim() || null,
        isrc: trackDraft.isrc.trim() || null,
        transferFromOtherDistributor: trackDraft.transferFromOtherDistributor,
        moderationNote: trackDraft.moderationNote.trim() || null,
        albumId: trackDraft.albumId === "__none__" ? null : trackDraft.albumId,
        platformLinks: trackDraft.platformLinks,
        smartlinkSlug: trackDraft.smartlinkSlug.trim() || null,
      }
      const response = await fetch(`/api/admin/tracks/${selectedTrack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      })
      if (response.ok) {
        toast.success("Трек сохранён")
        const data = await response.json()
        if (data.track) {
          setSelectedTrack(data.track)
          setTrackDraft(trackToDraft(data.track))
        }
        loadTracks()
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error ?? "Не удалось сохранить трек")
      }
    } catch {
      toast.error("Ошибка при сохранении")
    } finally {
      setSavingTrackId(null)
    }
  }

  const getSmartlinkUrl = (slug: string) => {
    if (typeof window === "undefined") return `https://parallaxmusic.ru/s/${slug}`
    return `${window.location.origin}/s/${slug}`
  }

  const handleCopySmartlink = (slug: string) => {
    const url = getSmartlinkUrl(slug)
    void navigator.clipboard.writeText(url).then(() => {
      toast.success("Ссылка скопирована")
    })
  }

  const openAlbumBulkDialog = (albumId: string, albumTracks: Track[]) => {
    const ordered = sortTracksByUploadOrder(albumTracks)
    setAlbumBulkAlbumId(albumId)
    setAlbumBulkTrackCount(ordered.length)
    const first = ordered[0]
    setAlbumBulkUpc(first?.upc ?? "")
    setAlbumBulkPlatformLinks(first?.platformLinks ?? {})
    setAlbumBulkOpen(true)
  }

  const openAlbumModDialog = (albumId: string, albumTracks: Track[]) => {
    setAlbumModAlbumId(albumId)
    setAlbumModTrackCount(albumTracks.length)
    setAlbumModStatus("__keep__")
    setAlbumModNote("")
    setAlbumModOpen(true)
  }

  const handleAlbumModSave = async () => {
    if (!albumModAlbumId) return
    const body: { status?: TrackStatus; moderationNote?: string } = {}
    if (albumModStatus !== "__keep__") body.status = albumModStatus as TrackStatus
    const noteTrim = albumModNote.trim()
    if (noteTrim) body.moderationNote = noteTrim
    if (Object.keys(body).length === 0) {
      toast.error("Выберите новый статус и/или введите комментарий модерации")
      return
    }
    setAlbumModSaving(true)
    try {
      const response = await fetch(`/api/admin/albums/${albumModAlbumId}/tracks-bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        toast.success(`Обновлено треков: ${data.updated ?? 0}`)
        setAlbumModOpen(false)
        loadTracks()
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error ?? "Не удалось обновить треки альбома")
      }
    } catch {
      toast.error("Ошибка при сохранении")
    } finally {
      setAlbumModSaving(false)
    }
  }

  const handleAlbumModClearComments = async () => {
    if (!albumModAlbumId) return
    setAlbumModSaving(true)
    try {
      const response = await fetch(`/api/admin/albums/${albumModAlbumId}/tracks-bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderationNote: null }),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        toast.success(`Комментарии очищены у треков: ${data.updated ?? 0}`)
        setAlbumModClearOpen(false)
        setAlbumModOpen(false)
        setAlbumModNote("")
        loadTracks()
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error ?? "Не удалось очистить комментарии")
      }
    } catch {
      toast.error("Ошибка при очистке комментариев")
    } finally {
      setAlbumModSaving(false)
    }
  }

  const handleAlbumBulkSave = async () => {
    if (!albumBulkAlbumId) return
    const hasAnyLink = Object.values(albumBulkPlatformLinks).some((v) => typeof v === "string" && v.trim().length > 0)
    if (!albumBulkUpc.trim() && !hasAnyLink) {
      toast.error("Укажите UPC и/или ссылки на платформы")
      return
    }
    setAlbumBulkSaving(true)
    try {
      const body: { upc?: string | null; platformLinks?: PlatformLinks } = {}
      if (albumBulkUpc.trim()) body.upc = albumBulkUpc.trim()
      else body.upc = null
      if (hasAnyLink) body.platformLinks = albumBulkPlatformLinks
      const response = await fetch(`/api/admin/albums/${albumBulkAlbumId}/tracks-bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      })
      if (response.ok) {
        const data = await response.json()
        toast.success(`Обновлено треков: ${data.updated ?? 0}`)
        setAlbumBulkOpen(false)
        loadTracks()
      } else {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error ?? "Не удалось обновить треки альбома")
      }
    } catch {
      toast.error("Ошибка при сохранении")
    } finally {
      setAlbumBulkSaving(false)
    }
  }

  const groupTracksByAlbum = (artistTracks: Track[]) => {
    const byAlbum = artistTracks.reduce<{ albumId: string | null; tracks: Track[] }[]>((acc, track) => {
      const aid = track.albumId ?? null
      const existing = acc.find((g) => g.albumId === aid)
      if (existing) existing.tracks.push(track)
      else acc.push({ albumId: aid, tracks: [track] })
      return acc
    }, [])
    return byAlbum
  }

  const safeFilename = (s: string) => (s ?? "").replace(/[/\\:*?"<>|]/g, "_").trim() || "track"

  const handleDownloadTrack = async (
    trackId: string,
    trackName: string,
    artistName?: string
  ) => {
    try {
      const response = await fetch(`/api/admin/uploads/audio/${trackId}`, {
        credentials: "include",
      })
      if (!response.ok) {
        toast.error("Не удалось скачать трек")
        return
      }

      const contentDisposition = response.headers.get("Content-Disposition")
      let filename = `${safeFilename(artistName ?? "")} - ${safeFilename(trackName)}.wav`

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1]
        }
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Трек скачан")
    } catch (error) {
      toast.error("Ошибка при скачивании трека")
    }
  }

  const handleDownloadAllAlbumTracks = async (orderedTracks: Track[]) => {
    if (orderedTracks.length === 0) return
    const albumId = orderedTracks[0]?.albumId
    if (!albumId) return
    setDownloadingAlbumId(albumId)
    let ok = 0
    try {
      for (const t of orderedTracks) {
        try {
          const response = await fetch(`/api/admin/uploads/audio/${t.id}`, {
            credentials: "include",
          })
          if (!response.ok) {
            toast.error(`Не удалось скачать: ${t.trackName}`)
            continue
          }
          const contentDisposition = response.headers.get("Content-Disposition")
          let filename = `${safeFilename(t.artistName)} - ${safeFilename(t.trackName)}.wav`
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i)
            if (filenameMatch?.[1]) filename = filenameMatch[1]
          }
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          ok++
          await new Promise((r) => setTimeout(r, 280))
        } catch {
          toast.error(`Ошибка при скачивании: ${t.trackName}`)
        }
      }
      if (ok === orderedTracks.length) {
        toast.success(`Скачано треков: ${ok}`)
      } else if (ok > 0) {
        toast.success(`Скачано: ${ok} из ${orderedTracks.length}`)
      } else {
        toast.error("Не удалось скачать аудио альбома")
      }
    } finally {
      setDownloadingAlbumId(null)
    }
  }

  const handleDownloadCover = async (
    trackId: string,
    trackName: string,
    artistName?: string
  ) => {
    try {
      const response = await fetch(`/api/admin/uploads/cover/${trackId}`, {
        credentials: "include",
      })
      if (!response.ok) {
        toast.error("Не удалось скачать обложку")
        return
      }
      const ext = response.headers.get("content-type")?.includes("png") ? "png" : "jpg"
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${safeFilename(artistName ?? "")} - ${safeFilename(trackName)}.${ext}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Обложка скачана")
    } catch (error) {
      toast.error("Ошибка при скачивании обложки")
    }
  }

  const handleCoverUpload = async (trackId: string, file: File) => {
    setUploadingCoverId(trackId)
    try {
      const formData = new FormData()
      formData.append("cover", file)

      const response = await fetch(`/api/admin/uploads/cover/${trackId}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || "Не удалось загрузить обложку")
        return
      }

      const data = await response.json()
      toast.success("Обложка успешно заменена")
      
      if (data.track && selectedTrack?.id === trackId) {
        setSelectedTrack(data.track)
        setTrackDraft(trackToDraft(data.track))
      }
      
      // Обновляем список треков
      loadTracks()
      
      // Обновляем ключ для принудительного обновления изображения
      setCoverRefreshKey((prev) => ({ ...prev, [trackId]: Date.now() }))
      
      // Сбрасываем input для возможности повторной загрузки того же файла
      setCoverFileInputKey((prev) => prev + 1)
    } catch (error) {
      toast.error("Ошибка при загрузке обложки")
    } finally {
      setUploadingCoverId(null)
    }
  }

  const handleCoverFileChange = (event: React.ChangeEvent<HTMLInputElement>, trackId: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверка формата
    const ext = file.name.toLowerCase().split(".").pop()
    if (!["jpg", "jpeg", "png"].includes(ext ?? "")) {
      toast.error("Обложка должна быть в формате JPEG или PNG")
      return
    }

    // Проверка размера (20 MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Размер обложки не должен превышать 20 MB")
      return
    }

    handleCoverUpload(trackId, file)
  }

  const handleUploadDraftCoverUpload = async (draftId: string, file: File) => {
    setUploadingDraftCoverId(draftId)
    try {
      const formData = new FormData()
      formData.append("cover", file)
      const response = await fetch(
        `/api/admin/upload-drafts/${encodeURIComponent(draftId)}/cover`,
        { method: "POST", body: formData, credentials: "include" }
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        toast.error((error as { error?: string }).error || "Не удалось загрузить обложку")
        return
      }
      const data = (await response.json()) as { draft?: UploadDraft }
      toast.success("Обложка черновика сохранена")
      if (data.draft && selectedUploadDraft?.id === draftId) {
        setSelectedUploadDraft(data.draft)
      }
      loadTracks()
      setCoverRefreshKey((prev) => ({ ...prev, [draftId]: Date.now() }))
      setDraftCoverFileInputKey((prev) => prev + 1)
    } catch {
      toast.error("Ошибка при загрузке обложки")
    } finally {
      setUploadingDraftCoverId(null)
    }
  }

  const handleUploadDraftCoverFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    draftId: string
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    const ext = file.name.toLowerCase().split(".").pop()
    if (!["jpg", "jpeg", "png"].includes(ext ?? "")) {
      toast.error("Обложка должна быть в формате JPEG или PNG")
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Размер обложки не должен превышать 20 MB")
      return
    }
    void handleUploadDraftCoverUpload(draftId, file)
  }

  const handleUploadDraftAudioUpload = async (draftId: string, file: File) => {
    setUploadingDraftAudioId(draftId)
    try {
      const formData = new FormData()
      formData.append("audio", file)
      const response = await fetch(
        `/api/admin/upload-drafts/${encodeURIComponent(draftId)}/audio`,
        { method: "POST", body: formData, credentials: "include" }
      )
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        toast.error((error as { error?: string }).error || "Не удалось загрузить WAV")
        return
      }
      const data = (await response.json()) as { draft?: UploadDraft }
      toast.success("WAV сохранён в черновик")
      if (data.draft && selectedUploadDraft?.id === draftId) {
        setSelectedUploadDraft(data.draft)
      }
      loadTracks()
      setDraftAudioFileInputKey((prev) => prev + 1)
    } catch {
      toast.error("Ошибка при загрузке WAV")
    } finally {
      setUploadingDraftAudioId(null)
    }
  }

  const handleUploadDraftAudioFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    draftId: string
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    const ext = file.name.toLowerCase().split(".").pop()
    if (ext !== "wav") {
      toast.error("Аудио должно быть в формате WAV")
      return
    }
    if (file.size > 80 * 1024 * 1024) {
      toast.error("Размер аудиофайла не должен превышать 80 MB")
      return
    }
    void handleUploadDraftAudioUpload(draftId, file)
  }

  const handleDeleteClick = (track: Track) => {
    setTrackToDelete(track)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!trackToDelete) return

    setDeletingId(trackToDelete.id)
    try {
      const response = await fetch(`/api/admin/tracks/${trackToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (response.ok) {
        toast.success("Трек удалён")
        setDeleteDialogOpen(false)
        setTrackToDelete(null)
        loadTracks()
      } else {
        toast.error("Не удалось удалить трек")
      }
    } catch (error) {
      toast.error("Ошибка при удалении трека")
    } finally {
      setDeletingId(null)
    }
  }

  const handleUploadDraftDeleteClick = (draft: UploadDraft) => {
    setUploadDraftToDelete(draft)
    setDeleteUploadDraftDialogOpen(true)
  }

  const handleUploadDraftDeleteConfirm = async () => {
    if (!uploadDraftToDelete) return
    setDeletingId(uploadDraftToDelete.id)
    try {
      const response = await fetch(
        `/api/admin/upload-drafts/${encodeURIComponent(uploadDraftToDelete.id)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      if (response.ok) {
        toast.success("Черновик удалён")
        setDeleteUploadDraftDialogOpen(false)
        setUploadDraftToDelete(null)
        if (selectedUploadDraft?.id === uploadDraftToDelete.id) {
          setIsDialogOpen(false)
          setSelectedUploadDraft(null)
        }
        loadTracks()
      } else {
        toast.error("Не удалось удалить черновик")
      }
    } catch {
      toast.error("Ошибка при удалении черновика")
    } finally {
      setDeletingId(null)
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingReleases = releaseDateFilteredTracks
    .filter((track) => track.releaseDate)
    .filter(
      (track) =>
        track.status !== "rejected" && track.status !== "postponed",
    )
    .filter((track) => {
      const date = new Date(track.releaseDate!)
      if (Number.isNaN(date.getTime())) return false
      return date.getTime() >= today.getTime()
    })
    .sort((a, b) => {
      const aDate = new Date(a.releaseDate!)
      const bDate = new Date(b.releaseDate!)
      return aDate.getTime() - bDate.getTime()
    })

  const sortedAlbums = [...albums].sort((a, b) => {
    const byArtist = a.artistName.localeCompare(b.artistName)
    if (byArtist !== 0) return byArtist
    return a.title.localeCompare(b.title)
  })

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
      <div className="mx-auto w-full max-w-[min(100vw-2rem,1680px)] px-4 space-y-6">
        <AdminSectionNav active="tracks" />

        <h1 className="text-2xl font-bold">Модерация треков</h1>

        {tracksTruncated ? (
          <Alert>
            <AlertTitle>Показаны не все треки</AlertTitle>
            <AlertDescription>
              Загружено {tracks.length} из {tracksTotal} по текущему фильтру (лимит{" "}
              {ADMIN_TRACKS_CLIENT_CAP}). Сузьте фильтр по пользователю, статусу или дате.
            </AlertDescription>
          </Alert>
        ) : null}

        {userIdFilterRaw ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Фильтр по пользователю</span>
              {filterUserLabel ? (
                <>
                  {": "}
                  <span className="text-foreground">{filterUserLabel}</span>
                </>
              ) : null}
              <span className="block sm:inline sm:ml-1 mt-1 sm:mt-0 font-mono text-xs text-muted-foreground">
                {filterUserLabel ? "· " : ""}
                {userIdFilterRaw}
              </span>
              <span className="block sm:inline text-foreground sm:ml-2">
                - треков: {tracksTotal}
                {showUploadDraftsInModeration && displayUploadDrafts.length > 0
                  ? ` · черновиков: ${displayUploadDrafts.length}`
                  : ""}
              </span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={resetTrackListFilters}
            >
              Показать всех
            </Button>
          </div>
        ) : null}

        {tracksTotalInDb === 0 && uploadDrafts.length === 0 ? (
          <div className="border rounded-lg p-12 text-center text-muted-foreground">
            Треков и активных черновиков загрузки пока нет
          </div>
        ) : !(
            tracksTotal > 0 ||
            (showUploadDraftsInModeration && displayUploadDrafts.length > 0)
          ) ? (
          <div className="border rounded-lg p-12 text-center space-y-3">
            <p className="text-muted-foreground">
              {userIdFilterRaw
                ? "У выбранного пользователя нет треков по текущим фильтрам и черновиков загрузки."
                : statusFilter === "upload_pending"
                  ? "Нет треков в статусе «Черновик (доработка пользователем)». Заявки из формы загрузки (черновики загрузки) показываются при фильтре «Все статусы» или «На модерации»."
                  : "Нет треков по выбранным фильтрам (дата публикации / статус). Черновики загрузки смотрите при фильтре «Все статусы» или «На модерации»."}
            </p>
            <Button type="button" variant="outline" onClick={resetTrackListFilters}>
              Показать всех
            </Button>
          </div>
        ) : (
          <>
            {upcomingReleases.length > 0 && (
              <Card className="border-primary/30 bg-muted/40">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setUpcomingExpanded((prev) => !prev)}
                >
                  <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">Ближайшие релизы</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Треки с запланированной датой выхода на площадки
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {upcomingExpanded ? "Свернуть" : "Показать"}
                    </span>
                  </CardHeader>
                </button>
                {upcomingExpanded && (
                  <CardContent className="space-y-2">
                    {upcomingReleases.map((track) => (
                      <div
                        key={track.id}
                        className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border rounded-md px-3 py-2 bg-background/60"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium">
                            {format(new Date(track.releaseDate!), "d MMM yyyy", {
                              locale: ru,
                            })}
                          </span>
                          <span className="text-sm">
                            {track.artistName} -{" "}
                            <span className="font-medium">{track.trackName}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Лейбл: {getReleaseLabelName(track.labelName)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Статус:{" "}
                            {
                              STATUS_OPTIONS.find((opt) => opt.value === track.status)
                                ?.label
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(track)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Подробнее
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            )}

            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <p className="text-sm text-muted-foreground">
                {userIdFilterRaw
                  ? `Треков в фильтре: ${tracksTotal} (всего в базе: ${tracksTotalInDb})${
                      showUploadDraftsInModeration && displayUploadDrafts.length > 0
                        ? ` · черновиков загрузки: ${displayUploadDrafts.length}`
                        : ""
                    }`
                  : `Всего треков: ${tracksTotalInDb} (в фильтре: ${tracksTotal})${
                      showUploadDraftsInModeration && displayUploadDrafts.length > 0
                        ? ` · черновиков загрузки: ${displayUploadDrafts.length}`
                        : ""
                    }`}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Дата публикации:</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "min-w-[168px] justify-between font-normal",
                        !releaseDateFromDraft && "text-muted-foreground"
                      )}
                    >
                      {releaseDateFromDraft ? (
                        format(
                          parseISO(releaseDateFromDraft + "T12:00:00"),
                          "PPP",
                          { locale: ru }
                        )
                      ) : (
                        <span>От</span>
                      )}
                      <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      locale={ru}
                      selected={
                        releaseDateFromDraft
                          ? parseISO(releaseDateFromDraft + "T12:00:00")
                          : undefined
                      }
                      onSelect={(date) =>
                        date && setReleaseDateFromDraft(format(date, "yyyy-MM-dd"))
                      }
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-sm text-muted-foreground">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "min-w-[168px] justify-between font-normal",
                        !releaseDateToDraft && "text-muted-foreground"
                      )}
                    >
                      {releaseDateToDraft ? (
                        format(
                          parseISO(releaseDateToDraft + "T12:00:00"),
                          "PPP",
                          { locale: ru }
                        )
                      ) : (
                        <span>До</span>
                      )}
                      <CalendarIcon className="h-4 w-4 opacity-50 shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      locale={ru}
                      selected={
                        releaseDateToDraft
                          ? parseISO(releaseDateToDraft + "T12:00:00")
                          : undefined
                      }
                      onSelect={(date) =>
                        date && setReleaseDateToDraft(format(date, "yyyy-MM-dd"))
                      }
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setReleaseDateFromApplied(releaseDateFromDraft)
                    setReleaseDateToApplied(releaseDateToDraft)
                  }}
                >
                  ОК
                </Button>
                {(releaseDateFromDraft || releaseDateToDraft || releaseDateFromApplied || releaseDateToApplied) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReleaseDateFromDraft("")
                      setReleaseDateToDraft("")
                      setReleaseDateFromApplied("")
                      setReleaseDateToApplied("")
                    }}
                  >
                    Сбросить дату
                  </Button>
                )}
                <span className="text-sm text-muted-foreground">Фильтр по статусу:</span>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as StatusFilter)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Все статусы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showUploadDraftsInModeration && displayUploadDrafts.length > 0 ? (
              <Card className="mb-4 border-dashed border-muted-foreground/40">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setUploadDraftsSectionExpanded((prev) => !prev)}
                >
                  <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">Черновики загрузки</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Заявки на загрузку (ещё не финализированы в трек), включая истёкшие и отменённые - можно открыть,
                        поправить статус и при необходимости нажать «Создать трек на модерации». Статус и поля - как в
                        карточке трека на модерации.
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {uploadDraftsSectionExpanded ? "Свернуть" : "Показать"}
                    </span>
                  </CardHeader>
                </button>
                {uploadDraftsSectionExpanded && (
                <CardContent className="space-y-2 pt-0">
                  {displayUploadDrafts.map((d) => {
                    const title = `${d.payload.trackName ?? ""}`.trim() || "Без названия"
                    const artist = `${d.payload.artistName ?? ""}`.trim() || "-"
                    return (
                      <div
                        key={d.id}
                        className={
                          d.status === "expired" || d.status === "cancelled"
                            ? "border rounded-md p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-amber-500/40 bg-amber-500/5"
                            : "border rounded-md p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                        }
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
                            {d.coverRelPath ? (
                              <img
                                src={`/api/admin/upload-drafts/${encodeURIComponent(d.id)}/cover`}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none"
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center p-1 text-center text-[9px] text-muted-foreground leading-tight">
                                {d.payload.requestAiCover ? `ИИ ${AI_COVER_REQUEST_PRICE_RUB} руб.` : "Нет"}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{title}</p>
                            <p className="text-sm text-muted-foreground truncate">{artist}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              Пользователь: {d.userId}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {d.kind === "album" ? "Альбом" : "Сингл"} · обновлён{" "}
                              {format(new Date(d.updatedAt), "d MMM yyyy, HH:mm", { locale: ru })}
                            </p>
                            {d.audioRelPath ? (
                              <p className="text-xs text-muted-foreground">WAV в черновике</p>
                            ) : (
                              <p className="text-xs text-amber-700 dark:text-amber-300">WAV не загружен</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap items-center shrink-0">
                          <Select
                            value={d.status}
                            onValueChange={(v) =>
                              void handleUploadDraftStatusChange(d.id, v as UploadDraftStatus)
                            }
                            disabled={updatingDraftId === d.id}
                          >
                            <SelectTrigger className="w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UPLOAD_DRAFT_STATUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="outline" size="sm" onClick={() => handleViewUploadDraft(d)}>
                            <Eye className="h-4 w-4 mr-1" />
                            Подробнее
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleUploadDraftDeleteClick(d)}
                            disabled={deletingId === d.id}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Удалить
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
                )}
              </Card>
            ) : null}

            <Tabs defaultValue="grouped" className="w-full">
              <TabsList>
                <TabsTrigger value="grouped">Группировка по артистам</TabsTrigger>
                <TabsTrigger value="simple">Простой список</TabsTrigger>
              </TabsList>

              <TabsContent value="grouped" className="space-y-4">
                {Object.entries(
                  statusFilteredTracks.reduce<Record<string, Track[]>>((acc, track) => {
                    const key = track.artistName?.trim() || "Без имени артиста"
                    if (!acc[key]) acc[key] = []
                    acc[key].push(track)
                    return acc
                  }, {})
                )
                  .sort(([aName], [bName]) => aName.localeCompare(bName))
                  .map(([artistName, artistTracks]) => {
                    const groupedTracks = [...artistTracks].sort((a, b) => {
                      const aDate = a.releaseDate || a.createdAt
                      const bDate = b.releaseDate || b.createdAt
                      return new Date(aDate).getTime() - new Date(bDate).getTime()
                    })
                    const isExpanded = expandedArtist === artistName

                    return (
                      <Card key={artistName} className="mb-4">
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => setExpandedArtist(isExpanded ? null : artistName)}
                        >
                          <CardHeader className="flex flex-row items-center justify-between gap-2">
                            <div>
                              <CardTitle className="text-lg">{artistName}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                Треков: {groupedTracks.length}
                              </p>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {isExpanded ? "Свернуть" : "Открыть"}
                            </span>
                          </CardHeader>
                        </button>
                        {isExpanded && (
                          <CardContent className="border-t pt-4 space-y-4">
                            {groupTracksByAlbum(groupedTracks).map(({ albumId, tracks: albumTracks }) => {
                              const orderedAlbumTracks = sortTracksByUploadOrder(albumTracks)
                              const albumTitle =
                                albumId != null
                                  ? albums.find((a) => a.id === albumId)?.title ?? null
                                  : null
                              return (
                              <div key={albumId ?? "no-album"} className="space-y-2">
                                {albumId && (
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-2">
                                    <span className="text-sm text-muted-foreground">
                                      Альбом
                                      {albumTitle ? (
                                        <>
                                          {" "}
                                          <span className="font-medium text-foreground">
                                            «{albumTitle}»
                                          </span>
                                        </>
                                      ) : null}
                                      <span className="text-muted-foreground">
                                        {" "}
                                        · {ruTracksCountLabel(orderedAlbumTracks.length)}
                                      </span>
                                    </span>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        disabled={downloadingAlbumId === albumId}
                                        onClick={() =>
                                          void handleDownloadAllAlbumTracks(orderedAlbumTracks)
                                        }
                                      >
                                        <Download className="h-4 w-4 mr-1" />
                                        {downloadingAlbumId === albumId
                                          ? "Скачивание…"
                                          : "Скачать все треки"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          openAlbumModDialog(albumId, orderedAlbumTracks)
                                        }
                                      >
                                        Статус и комментарий
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          openAlbumBulkDialog(albumId, orderedAlbumTracks)
                                        }
                                      >
                                        <Link2 className="h-4 w-4 mr-1" />
                                        UPC и ссылки
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                {orderedAlbumTracks.map((track, index) => (
                              <div
                                key={track.id}
                                className="border rounded-md p-3 flex flex-col gap-2"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-3">
                                    <span className="text-sm font-semibold mt-0.5">
                                      {index + 1}.
                                    </span>
                                    <div className="w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
                                      {track.coverPath?.trim() ? (
                                        <img
                                          src={`/api/admin/uploads/cover/${track.id}`}
                                          alt={track.trackName}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display =
                                              "none"
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center p-1 text-center text-[9px] text-muted-foreground leading-tight">
                                          {track.needsAiCover ? `ИИ ${AI_COVER_REQUEST_PRICE_RUB} руб.` : "Нет"}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-medium">{track.trackName}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Пользователь: {track.userId}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Лейбл: {getReleaseLabelName(track.labelName)}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Жанр: {track.genre}
                                      </p>
                                      {track.upc && (
                                        <p className="text-xs text-muted-foreground">
                                          UPC: {track.upc}
                                        </p>
                                      )}
                                      <p className="text-xs text-muted-foreground">
                                        Дата публикации:{" "}
                                        {track.releaseDate
                                          ? format(
                                              new Date(track.releaseDate),
                                              "d MMM yyyy",
                                              { locale: ru }
                                            )
                                          : format(
                                              new Date(track.createdAt),
                                              "d MMM yyyy",
                                              { locale: ru }
                                            )}
                                      </p>
                                    </div>
                                  </div>
                                  <Select
                                    value={track.status}
                                    onValueChange={(v) =>
                                      handleStatusChange(track.id, v as TrackStatus)
                                    }
                                    disabled={updatingId === track.id}
                                  >
                                    <SelectTrigger className="w-[170px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {STATUS_OPTIONS.map((opt) => (
                                        <SelectItem
                                          key={opt.value}
                                          value={opt.value}
                                        >
                                          {opt.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDetails(track)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Подробнее
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteClick(track)}
                                    disabled={deletingId === track.id}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Удалить
                                  </Button>
                                </div>
                              </div>
                                ))}
                              </div>
                              )
                            })}
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
              </TabsContent>

              <TabsContent value="simple">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Треки простым списком</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Показано {simpleListTracksVisible.length} из {simpleListTracks.length}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span>Сортировка:</span>
                      <Select
                        value={trackListSortField}
                        onValueChange={(value) => setTrackListSortField(value as TrackListSortField)}
                      >
                        <SelectTrigger className="w-[220px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="releaseDate">По дате публикации</SelectItem>
                          <SelectItem value="createdAt">По дате создания</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={trackListSortDirection}
                        onValueChange={(value) => setTrackListSortDirection(value as "asc" | "desc")}
                      >
                        <SelectTrigger className="w-[180px] bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Сначала старые</SelectItem>
                          <SelectItem value="desc">Сначала новые</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Table className="min-w-[1320px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">Артист</TableHead>
                          <TableHead className="min-w-[160px]">Трек</TableHead>
                          <TableHead className="min-w-[120px]">Альбом</TableHead>
                          <TableHead className="min-w-[200px]">Пользователь (email)</TableHead>
                          <TableHead className="min-w-[130px]">Дата создания</TableHead>
                          <TableHead className="min-w-[120px]">Дата публикации</TableHead>
                          <TableHead className="min-w-[100px]">UPC</TableHead>
                          <TableHead className="min-w-[200px]">Статус</TableHead>
                          <TableHead className="min-w-[200px] text-right">Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {simpleListTracksVisible.map((track) => (
                          <TableRow key={track.id}>
                            <TableCell className="max-w-[220px] whitespace-normal">
                              {track.artistName?.trim() || "Без имени артиста"}
                            </TableCell>
                            <TableCell className="max-w-[260px] whitespace-normal">
                              {track.trackName}
                            </TableCell>
                            <TableCell>
                              {track.albumId ? trackAlbumTitleById[track.albumId] ?? "-" : "Сингл"}
                            </TableCell>
                            <TableCell className="max-w-[260px] whitespace-normal break-all text-sm">
                              {track.userId}
                            </TableCell>
                            <TableCell>
                              {format(new Date(track.createdAt), "d MMM yyyy, HH:mm", { locale: ru })}
                            </TableCell>
                            <TableCell>
                              {track.releaseDate
                                ? format(new Date(track.releaseDate), "d MMM yyyy", { locale: ru })
                                : "-"}
                            </TableCell>
                            <TableCell>{track.upc?.trim() ? track.upc : "-"}</TableCell>
                            <TableCell>
                              <Select
                                value={track.status}
                                onValueChange={(v) =>
                                  handleStatusChange(track.id, v as TrackStatus)
                                }
                                disabled={updatingId === track.id}
                              >
                                <SelectTrigger className="w-[220px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {STATUS_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewDetails(track)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Подробнее
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteClick(track)}
                                  disabled={deletingId === track.id}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Удалить
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {simpleListHasMore ? (
                      <div className="flex flex-col items-center gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setSimpleListVisibleCount((n) => n + SIMPLE_LIST_PAGE_SIZE)
                          }
                        >
                          Еще (+{SIMPLE_LIST_PAGE_SIZE})
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) setSelectedUploadDraft(null)
          }}
        >
          <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {selectedUploadDraft ? "Редактирование черновика загрузки" : "Редактирование трека"}
              </DialogTitle>
              {selectedUploadDraft ? (
                <DialogDescription className="font-mono text-xs">
                  id: {selectedUploadDraft.id} · {selectedUploadDraft.kind}
                </DialogDescription>
              ) : null}
            </DialogHeader>
            {selectedTrack &&
            (selectedTrack.needsAiCover ||
              (trackEditBundleAddonsFetched && trackEditBundleAddons.length > 0)) ? (
              <Alert className="border-border bg-muted/40">
                <Info className="h-4 w-4 text-muted-foreground" />
                <AlertTitle>Заказанные доп. услуги при загрузке</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 text-foreground space-y-0.5">
                    {selectedTrack.needsAiCover ? (
                      <li key="ai-cover-order">{ruMessages.cabinet.promotion.aiCover.title}</li>
                    ) : null}
                    {trackEditBundleAddons.map((line, idx) => (
                      <li key={`${line.type}-${line.quantity}-${idx}`}>
                        {formatUploadAddonBundleLine(line, ruMessages.cabinet.promotion)}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}
            {(selectedTrack || selectedUploadDraft) && trackDraft && (
              <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-track-name">Название трека</Label>
                      <Input
                        id="admin-track-name"
                        value={trackDraft.trackName}
                        onChange={(e) =>
                          setTrackDraft((d) => d && { ...d, trackName: e.target.value })
                        }
                        placeholder="Название трека"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-artist">Исполнитель</Label>
                      <Input
                        id="admin-artist"
                        value={trackDraft.artistName}
                        onChange={(e) =>
                          setTrackDraft((d) => d && { ...d, artistName: e.target.value })
                        }
                        placeholder="Исполнитель"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-label-name">Лейбл</Label>
                      <Input
                        id="admin-label-name"
                        value={trackDraft.labelName}
                        onChange={(e) =>
                          setTrackDraft((d) => d && { ...d, labelName: e.target.value })
                        }
                        placeholder={DEFAULT_RELEASE_LABEL_NAME}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Жанр</Label>
                      <Select
                        value={
                          GENRES.includes(trackDraft.genre as (typeof GENRES)[number])
                            ? trackDraft.genre
                            : trackDraft.genre || "Other"
                        }
                        onValueChange={(v) =>
                          setTrackDraft((d) => d && { ...d, genre: v })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Выберите жанр" />
                        </SelectTrigger>
                        <SelectContent>
                          {genreKeys.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                          {trackDraft.genre &&
                            !GENRES.includes(trackDraft.genre as (typeof GENRES)[number]) && (
                              <SelectItem value={trackDraft.genre}>
                                {trackDraft.genre}
                              </SelectItem>
                            )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Настроение трека</Label>
                      <Select
                        value={trackDraft.mood || "__none__"}
                        onValueChange={(v) =>
                          setTrackDraft((d) =>
                            d ? { ...d, mood: v === "__none__" ? "" : v } : d
                          )
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Выберите настроение" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Не указано</SelectItem>
                          {moodKeys.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>Дата публикации на площадки</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal justify-between",
                              !trackDraft.releaseDate && "text-muted-foreground"
                            )}
                          >
                            {trackDraft.releaseDate ? (
                              format(
                                parseISO(trackDraft.releaseDate + "T12:00:00"),
                                "PPP",
                                { locale: ru }
                              )
                            ) : (
                              <span>Выберите дату</span>
                            )}
                            <CalendarIcon className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              trackDraft.releaseDate
                                ? parseISO(trackDraft.releaseDate + "T12:00:00")
                                : undefined
                            }
                            onSelect={(date) =>
                              setTrackDraft((d) =>
                                d && date
                                  ? { ...d, releaseDate: format(date, "yyyy-MM-dd") }
                                  : d
                              )
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {selectedTrack ? (
                      <div className="space-y-2">
                        <Label>Статус модерации</Label>
                        <Select
                          value={trackDraft.status}
                          onValueChange={(v) =>
                            setTrackDraft((d) =>
                              d ? { ...d, status: v as TrackStatus } : d
                            )
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Статус черновика</Label>
                        <Select
                          value={uploadDraftRowStatus}
                          onValueChange={(v) => setUploadDraftRowStatus(v as UploadDraftStatus)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UPLOAD_DRAFT_STATUS_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {selectedTrack ? (
                      <div className="space-y-2">
                        <Label>Альбом</Label>
                        <Select
                          value={trackDraft.albumId}
                          onValueChange={(v) =>
                            setTrackDraft((d) => (d ? { ...d, albumId: v } : d))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Выберите альбом" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Без альбома</SelectItem>
                            {sortedAlbums.map((album) => (
                              <SelectItem key={album.id} value={album.id}>
                                {album.artistName} - {album.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : selectedUploadDraft?.albumId ? (
                      <p className="text-xs text-muted-foreground md:col-span-2">
                        Привязка к альбому (id):{" "}
                        <span className="font-mono">{selectedUploadDraft.albumId}</span>
                      </p>
                    ) : null}
                    <div className="md:col-span-2 flex flex-wrap items-start gap-3 rounded-md border border-border p-3">
                      <Checkbox
                        id="admin-transfer-distributor"
                        checked={trackDraft.transferFromOtherDistributor}
                        onCheckedChange={(c) => {
                          const on = c === true
                          setTrackDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  transferFromOtherDistributor: on,
                                  ...(!on ? { upc: "", isrc: "" } : {}),
                                }
                              : d
                          )
                        }}
                      />
                      <label
                        htmlFor="admin-transfer-distributor"
                        className="cursor-pointer text-sm leading-snug"
                      >
                        Перенос от другого дистрибьютора (нужны UPC и ISRC)
                      </label>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="admin-upc">UPC</Label>
                        <Input
                          id="admin-upc"
                          className="font-mono"
                          placeholder="UPC"
                          value={trackDraft.upc}
                          onChange={(e) =>
                            setTrackDraft((d) => (d ? { ...d, upc: e.target.value } : d))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-isrc">ISRC</Label>
                        <Input
                          id="admin-isrc"
                          className="font-mono"
                          placeholder="ISRC"
                          value={trackDraft.isrc}
                          onChange={(e) =>
                            setTrackDraft((d) => (d ? { ...d, isrc: e.target.value } : d))
                          }
                        />
                      </div>
                    </div>
                    {selectedTrack ? (
                      <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="admin-mod-note">
                          Комментарий модерации (при «Отклонено» / «Отложено»)
                        </Label>
                        <Textarea
                          id="admin-mod-note"
                          className="min-h-[80px]"
                          value={trackDraft.moderationNote}
                          onChange={(e) =>
                            setTrackDraft((d) =>
                              d ? { ...d, moderationNote: e.target.value } : d
                            )
                          }
                        />
                      </div>
                    ) : null}

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="admin-short-desc">Краткое описание трека</Label>
                      <Input
                        id="admin-short-desc"
                        placeholder="Кратко опишите трек (до 500 символов)"
                        value={trackDraft.shortDescription}
                        onChange={(e) =>
                          setTrackDraft((d) =>
                            d ? { ...d, shortDescription: e.target.value } : d
                          )
                        }
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="admin-lyrics">Текст песни</Label>
                      <Textarea
                        id="admin-lyrics"
                        placeholder="Вставьте полный текст песни (до 5000 символов)"
                        rows={6}
                        value={trackDraft.lyricsText}
                        onChange={(e) =>
                          setTrackDraft((d) =>
                            d ? { ...d, lyricsText: e.target.value } : d
                          )
                        }
                      />
                    </div>

                    <div className="md:col-span-2 grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admin-lyrics-author">Автор слов</Label>
                        <Input
                          id="admin-lyrics-author"
                          placeholder="Полное ФИО (без сокращений)"
                          value={trackDraft.lyricsAuthor}
                          onChange={(e) =>
                            setTrackDraft((d) =>
                              d ? { ...d, lyricsAuthor: e.target.value } : d
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-music-author">Автор музыки</Label>
                        <Input
                          id="admin-music-author"
                          placeholder="Полное ФИО (без сокращений)"
                          value={trackDraft.musicAuthor}
                          onChange={(e) =>
                            setTrackDraft((d) =>
                              d ? { ...d, musicAuthor: e.target.value } : d
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="admin-backing">Автор фонограммы</Label>
                        <Input
                          id="admin-backing"
                          value={trackDraft.backingAuthor}
                          onChange={(e) =>
                            setTrackDraft((d) =>
                              d ? { ...d, backingAuthor: e.target.value } : d
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Это инструментал</Label>
                        <Select
                          value={trackDraft.isInstrumental ? "yes" : "no"}
                          onValueChange={(value) => {
                            const isInstrumental = value === "yes"
                            setTrackDraft((d) =>
                              d
                                ? {
                                    ...d,
                                    isInstrumental,
                                    lyricsRights: isInstrumental ? "" : d.lyricsRights,
                                    performanceRights: isInstrumental
                                      ? ""
                                      : d.performanceRights,
                                  }
                                : d
                            )
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Выберите вариант" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no">Нет</SelectItem>
                            <SelectItem value="yes">Да</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Права на музыку</Label>
                        <Select
                          value={
                            !trackDraft.musicRights
                              ? RIGHTS_EMPTY
                              : MUSIC_RIGHTS_OPTIONS.includes(
                                    trackDraft.musicRights as (typeof MUSIC_RIGHTS_OPTIONS)[number]
                                  )
                                ? trackDraft.musicRights
                                : trackDraft.musicRights
                          }
                          onValueChange={(v) => {
                            const rights = v === RIGHTS_EMPTY ? "" : v
                            setTrackDraft((d) => {
                              if (!d) return d
                              const next = { ...d, musicRights: rights }
                              if (!musicRightsRequiresAiService(rights)) {
                                next.musicAiService = ""
                              }
                              return next
                            })
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={RIGHTS_EMPTY}>-</SelectItem>
                            {MUSIC_RIGHTS_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                            {trackDraft.musicRights &&
                              !MUSIC_RIGHTS_OPTIONS.includes(
                                trackDraft.musicRights as (typeof MUSIC_RIGHTS_OPTIONS)[number]
                              ) && (
                                <SelectItem value={trackDraft.musicRights}>
                                  {trackDraft.musicRights}
                                </SelectItem>
                              )}
                          </SelectContent>
                        </Select>
                      </div>
                      {musicRightsRequiresAiService(trackDraft.musicRights) && (
                        <div className="space-y-2">
                          <Label htmlFor="admin-ai-svc">Название/ссылка на ИИ сервис</Label>
                          <Input
                            id="admin-ai-svc"
                            placeholder="Например: Suno, Udio, ссылка на сервис"
                            value={trackDraft.musicAiService}
                            onChange={(e) =>
                              setTrackDraft((d) =>
                                d ? { ...d, musicAiService: e.target.value } : d
                              )
                            }
                          />
                        </div>
                      )}
                      {!trackDraft.isInstrumental && (
                        <>
                          <div className="space-y-2">
                            <Label>Права на текст</Label>
                            <Select
                              value={
                                !trackDraft.lyricsRights
                                  ? RIGHTS_EMPTY
                                  : LYRICS_RIGHTS_OPTIONS.includes(
                                        trackDraft.lyricsRights as (typeof LYRICS_RIGHTS_OPTIONS)[number]
                                      )
                                    ? trackDraft.lyricsRights
                                    : trackDraft.lyricsRights
                              }
                              onValueChange={(v) =>
                                setTrackDraft((d) =>
                                  d
                                    ? {
                                        ...d,
                                        lyricsRights: v === RIGHTS_EMPTY ? "" : v,
                                      }
                                    : d
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Выберите вариант" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={RIGHTS_EMPTY}>-</SelectItem>
                                {LYRICS_RIGHTS_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                                {trackDraft.lyricsRights &&
                                  !LYRICS_RIGHTS_OPTIONS.includes(
                                    trackDraft.lyricsRights as (typeof LYRICS_RIGHTS_OPTIONS)[number]
                                  ) && (
                                    <SelectItem value={trackDraft.lyricsRights}>
                                      {trackDraft.lyricsRights}
                                    </SelectItem>
                                  )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Права на исполнение</Label>
                            <Select
                              value={
                                !trackDraft.performanceRights
                                  ? RIGHTS_EMPTY
                                  : PERFORMANCE_RIGHTS_OPTIONS.includes(
                                        trackDraft.performanceRights as (typeof PERFORMANCE_RIGHTS_OPTIONS)[number]
                                      )
                                    ? trackDraft.performanceRights
                                    : trackDraft.performanceRights
                              }
                              onValueChange={(v) =>
                                setTrackDraft((d) =>
                                  d
                                    ? {
                                        ...d,
                                        performanceRights:
                                          v === RIGHTS_EMPTY ? "" : v,
                                      }
                                    : d
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Выберите вариант" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={RIGHTS_EMPTY}>-</SelectItem>
                                {PERFORMANCE_RIGHTS_OPTIONS.map((opt) => (
                                  <SelectItem key={opt} value={opt}>
                                    {opt}
                                  </SelectItem>
                                ))}
                                {trackDraft.performanceRights &&
                                  !PERFORMANCE_RIGHTS_OPTIONS.includes(
                                    trackDraft.performanceRights as (typeof PERFORMANCE_RIGHTS_OPTIONS)[number]
                                  ) && (
                                    <SelectItem value={trackDraft.performanceRights}>
                                      {trackDraft.performanceRights}
                                    </SelectItem>
                                  )}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <Label>
                        Обложка
                        {selectedTrack || selectedUploadDraft ? " (заменить файл)" : ""}
                      </Label>
                      {selectedTrack ? (
                        selectedTrack.needsAiCover && !selectedTrack.coverPath?.trim() ? (
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            Пользователь заказал ИИ-обложку ({AI_COVER_REQUEST_PRICE_RUB} руб.) - файла ещё нет.
                          </p>
                        ) : null
                      ) : selectedUploadDraft?.payload.requestAiCover && !selectedUploadDraft.coverRelPath ? (
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Заказ ИИ-обложки ({AI_COVER_REQUEST_PRICE_RUB} руб.) - файла в черновике ещё нет.
                        </p>
                      ) : null}
                      <div className="rounded-lg border overflow-hidden max-w-xs min-h-[120px] bg-muted">
                        {selectedTrack ? (
                          selectedTrack.coverPath?.trim() ? (
                            <img
                              src={`/api/admin/uploads/cover/${selectedTrack.id}?t=${coverRefreshKey[selectedTrack.id] || Date.now()}`}
                              alt=""
                              className="w-full h-auto"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none"
                              }}
                              key={`${selectedTrack.id}-${coverRefreshKey[selectedTrack.id] || selectedTrack.coverPath}`}
                            />
                          ) : (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                              Превью недоступно до загрузки обложки.
                            </div>
                          )
                        ) : selectedUploadDraft?.coverRelPath ? (
                          <img
                            src={`/api/admin/upload-drafts/${encodeURIComponent(selectedUploadDraft.id)}/cover?t=${coverRefreshKey[selectedUploadDraft.id] || 0}`}
                            alt=""
                            className="w-full h-auto"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none"
                            }}
                            key={`draft-${selectedUploadDraft.id}-${coverRefreshKey[selectedUploadDraft.id] || selectedUploadDraft.coverRelPath}`}
                          />
                        ) : (
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            Файла обложки в черновике нет.
                          </div>
                        )}
                      </div>
                      {selectedTrack ? (
                        <>
                          <Input
                            key={coverFileInputKey}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png"
                            onChange={(e) => handleCoverFileChange(e, selectedTrack.id)}
                            disabled={uploadingCoverId === selectedTrack.id}
                            className="cursor-pointer max-w-md"
                          />
                          {uploadingCoverId === selectedTrack.id && (
                            <p className="text-xs text-muted-foreground">Загрузка...</p>
                          )}
                        </>
                      ) : selectedUploadDraft ? (
                        uploadDraftMediaEditable(selectedUploadDraft) ? (
                          <>
                            <Input
                              key={draftCoverFileInputKey}
                              type="file"
                              accept="image/jpeg,image/jpg,image/png"
                              onChange={(e) =>
                                handleUploadDraftCoverFileChange(e, selectedUploadDraft.id)
                              }
                              disabled={uploadingDraftCoverId === selectedUploadDraft.id}
                              className="cursor-pointer max-w-md"
                            />
                            {uploadingDraftCoverId === selectedUploadDraft.id && (
                              <p className="text-xs text-muted-foreground">Загрузка...</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Файл обложки нельзя изменить: черновик финализирован, истёк или отменён.
                          </p>
                        )
                      ) : null}
                    </div>

                    {selectedUploadDraft?.kind === "single" ? (
                      <div className="md:col-span-2 space-y-2">
                        <Label>WAV (загрузить или заменить)</Label>
                        {selectedUploadDraft.audioRelPath ? (
                          <p className="text-xs text-muted-foreground">WAV уже есть в черновике</p>
                        ) : (
                          <p className="text-xs text-amber-700 dark:text-amber-300">WAV в черновике не загружен</p>
                        )}
                        {uploadDraftMediaEditable(selectedUploadDraft) ? (
                          <>
                            <Input
                              key={draftAudioFileInputKey}
                              type="file"
                              accept=".wav,audio/wav,audio/x-wav"
                              onChange={(e) =>
                                handleUploadDraftAudioFileChange(e, selectedUploadDraft.id)
                              }
                              disabled={uploadingDraftAudioId === selectedUploadDraft.id}
                              className="cursor-pointer max-w-md"
                            />
                            {uploadingDraftAudioId === selectedUploadDraft.id && (
                              <p className="text-xs text-muted-foreground">Загрузка...</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            WAV нельзя изменить: черновик финализирован, истёк или отменён.
                          </p>
                        )}
                      </div>
                    ) : selectedUploadDraft?.kind === "album" ? (
                      <p className="md:col-span-2 text-xs text-muted-foreground">
                        Для черновика альбома WAV загружается отдельно по каждому треку в кабинете пользователя.
                      </p>
                    ) : null}

                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-track-owner-email">Пользователь (email)</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="admin-track-owner-email"
                        type="email"
                        autoComplete="off"
                        className="font-mono text-sm"
                        value={trackDraft.userId}
                        onChange={(e) =>
                          setTrackDraft((d) => (d ? { ...d, userId: e.target.value } : d))
                        }
                        placeholder="email из личного кабинета"
                        disabled={Boolean(selectedUploadDraft)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        disabled={!trackDraft.userId.trim()}
                        onClick={() =>
                          router.push(
                            `/admin26081993/cabinet-users?userId=${encodeURIComponent(trackDraft.userId.trim())}&label=${encodeURIComponent(trackDraft.userId.trim())}`
                          )
                        }
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Пользователь ЛК
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedUploadDraft
                        ? "Владелец черновика задаётся при создании заявки; смена email здесь недоступна."
                        : "Должен совпадать с аккаунтом в кабинете. Если у трека есть альбом, он должен принадлежать этому же пользователю."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Дата создания</Label>
                    <p className="text-sm text-muted-foreground">
                      {format(
                        new Date(
                          selectedTrack ? selectedTrack.createdAt : selectedUploadDraft!.createdAt
                        ),
                        "d MMM yyyy, HH:mm",
                        {
                          locale: ru,
                        }
                      )}
                    </p>
                  </div>
                </div>

                {selectedTrack ? (
                <div className="md:col-span-2 pt-4 border-t space-y-3">
                  <Label>Ссылки на стриминговые платформы</Label>
                  <div className="grid gap-2">
                    {SMARTLINK_PLATFORMS.map(({ key, label }) => (
                      <div key={key} className="flex flex-col gap-1">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <Input
                          type="url"
                          placeholder={`URL для ${label}`}
                          value={trackDraft.platformLinks[key as keyof PlatformLinks] ?? ""}
                          onChange={(e) =>
                            setTrackDraft((d) =>
                              d
                                ? {
                                    ...d,
                                    platformLinks: {
                                      ...d.platformLinks,
                                      [key]: e.target.value.trim() || undefined,
                                    },
                                  }
                                : d
                            )
                          }
                          className="font-mono text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-smart-slug">Слаг смартлинка (после /s/)</Label>
                    <Input
                      id="admin-smart-slug"
                      className="font-mono max-w-md"
                      value={trackDraft.smartlinkSlug}
                      onChange={(e) =>
                        setTrackDraft((d) =>
                          d ? { ...d, smartlinkSlug: e.target.value } : d
                        )
                      }
                      placeholder="например abc123xyz"
                    />
                    {trackDraft.smartlinkSlug.trim() && (
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          readOnly
                          value={getSmartlinkUrl(trackDraft.smartlinkSlug.trim())}
                          className="font-mono text-sm flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() =>
                            handleCopySmartlink(trackDraft.smartlinkSlug.trim())
                          }
                          title="Копировать ссылку"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                ) : null}

                <div className="md:col-span-2 flex flex-col sm:flex-row gap-2 pt-2">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={selectedTrack ? handleSaveTrackCard : handleSaveUploadDraft}
                    disabled={
                      savingTrackId === (selectedTrack?.id ?? selectedUploadDraft?.id ?? "") ||
                      finalizingDraftId === selectedUploadDraft?.id ||
                      uploadingDraftCoverId === selectedUploadDraft?.id ||
                      uploadingDraftAudioId === selectedUploadDraft?.id
                    }
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingTrackId === (selectedTrack?.id ?? selectedUploadDraft?.id)
                      ? "Сохранение…"
                      : "Сохранить изменения"}
                  </Button>
                  {!selectedTrack && selectedUploadDraft && selectedUploadDraft.status !== "finalized" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      onClick={() => void handleFinalizeUploadDraft()}
                      disabled={
                        finalizingDraftId === selectedUploadDraft.id ||
                        savingTrackId === selectedUploadDraft.id
                      }
                    >
                      <FileCheck className="h-4 w-4 mr-2" />
                      {finalizingDraftId === selectedUploadDraft.id
                        ? "Создание трека…"
                        : "Создать трек на модерации"}
                    </Button>
                  ) : null}
                </div>

                <div className="md:col-span-2 flex gap-3 pt-2 border-t">
                  {selectedTrack ? (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          handleDownloadTrack(
                            selectedTrack.id,
                            trackDraft.trackName,
                            trackDraft.artistName
                          )
                        }
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Скачать трек
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          handleDownloadCover(
                            selectedTrack.id,
                            trackDraft.trackName,
                            trackDraft.artistName
                          )
                        }
                        className="flex-1"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Скачать обложку
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!selectedUploadDraft?.audioRelPath}
                        onClick={() =>
                          selectedUploadDraft &&
                          void handleDownloadUploadDraftAudio(
                            selectedUploadDraft.id,
                            trackDraft.trackName,
                            trackDraft.artistName
                          )
                        }
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Скачать WAV черновика
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!selectedUploadDraft?.coverRelPath}
                        onClick={() =>
                          selectedUploadDraft &&
                          void handleDownloadUploadDraftCover(
                            selectedUploadDraft.id,
                            trackDraft.trackName,
                            trackDraft.artistName
                          )
                        }
                        className="flex-1"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Скачать обложку черновика
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={albumModOpen}
          onOpenChange={(open) => {
            if (!open) setAlbumModClearOpen(false)
            setAlbumModOpen(open)
          }}
        >
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Статус и комментарий для альбома</DialogTitle>
              <DialogDescription>
                Изменения применятся ко всем {albumModTrackCount} трекам этого альбома. Статус «не
                менять» оставит текущий статус каждого трека без изменений.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Статус модерации</Label>
                <Select value={albumModStatus} onValueChange={setAlbumModStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__keep__">Не менять статус</SelectItem>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="album-mod-note">Комментарий модерации</Label>
                <Textarea
                  id="album-mod-note"
                  className="min-h-[100px]"
                  placeholder="Одинаковый текст для всех треков альбома (необязательно)"
                  value={albumModNote}
                  onChange={(e) => setAlbumModNote(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Пустое поле - не менять комментарий у треков.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={albumModSaving}
                  onClick={() => setAlbumModClearOpen(true)}
                >
                  Очистить комментарий у всех треков
                </Button>
              </div>
              <div className="flex gap-2 pt-2 flex-wrap">
                <Button onClick={handleAlbumModSave} disabled={albumModSaving}>
                  {albumModSaving ? "Сохранение…" : "Применить ко всем трекам"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAlbumModOpen(false)}
                  disabled={albumModSaving}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={albumModClearOpen} onOpenChange={setAlbumModClearOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Очистить комментарии модерации?</AlertDialogTitle>
              <AlertDialogDescription>
                У всех {albumModTrackCount} треков этого альбома поле «комментарий модерации» будет
                сброшено. Статусы треков не изменятся.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={albumModSaving}>Отмена</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={albumModSaving}
                onClick={(e) => {
                  e.preventDefault()
                  void handleAlbumModClearComments()
                }}
              >
                {albumModSaving ? "Очистка…" : "Очистить у всех"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={albumBulkOpen} onOpenChange={setAlbumBulkOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>UPC и ссылки для альбома</DialogTitle>
              <DialogDescription>
                Значения будут применены ко всем {albumBulkTrackCount} трекам альбома
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">UPC</label>
                <Input
                  className="font-mono mt-1 max-w-xs"
                  placeholder="UPC"
                  value={albumBulkUpc}
                  onChange={(e) => setAlbumBulkUpc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Ссылки на стриминговые платформы
                </label>
                <div className="grid gap-2">
                  {SMARTLINK_PLATFORMS.map(({ key, label }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <Input
                        type="url"
                        placeholder={`URL для ${label}`}
                        value={albumBulkPlatformLinks[key as keyof PlatformLinks] ?? ""}
                        onChange={(e) =>
                          setAlbumBulkPlatformLinks((prev) => ({
                            ...prev,
                            [key]: e.target.value.trim() || undefined,
                          }))
                        }
                        className="font-mono text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleAlbumBulkSave} disabled={albumBulkSaving}>
                  {albumBulkSaving ? "Сохранение…" : "Применить ко всем трекам альбома"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAlbumBulkOpen(false)}
                  disabled={albumBulkSaving}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить трек?</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите полностью удалить трек "{trackToDelete?.trackName}"? Это действие нельзя отменить. Будет удалён трек, обложка и все связанные данные.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deletingId !== null}
              >
                {deletingId ? "Удаление..." : "Удалить"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={deleteUploadDraftDialogOpen}
          onOpenChange={setDeleteUploadDraftDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить черновик?</AlertDialogTitle>
              <AlertDialogDescription>
                Вы уверены, что хотите удалить черновик "
                {`${uploadDraftToDelete?.payload.trackName ?? ""}`.trim() || "Без названия"}"?
                Это действие нельзя отменить. Будут удалены черновик и связанные файлы.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleUploadDraftDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={deletingId !== null}
              >
                {deletingId ? "Удаление..." : "Удалить"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
