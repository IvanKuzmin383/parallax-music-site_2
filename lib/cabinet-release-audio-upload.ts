import type { Track } from "@/lib/tracks"

export type ReleaseAudioUploadResult = {
  track?: Track
  tracks?: Track[]
  error?: string
}

export function uploadReleaseTrackAudio(
  releaseId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<ReleaseAudioUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const fd = new FormData()
    const baseName = file.name.replace(/\.[^.]+$/, "").trim()
    fd.append("audio", file)
    if (baseName) fd.append("trackName", baseName)

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable || !onProgress) return
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    })

    xhr.addEventListener("load", () => {
      try {
        const data = JSON.parse(xhr.responseText) as ReleaseAudioUploadResult
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data)
          return
        }
        reject(new Error(data.error ?? "Не удалось загрузить аудио"))
      } catch {
        reject(new Error("Не удалось разобрать ответ сервера"))
      }
    })

    xhr.addEventListener("error", () => reject(new Error("Ошибка сети при загрузке")))
    xhr.addEventListener("abort", () => reject(new Error("Загрузка отменена")))

    xhr.open("POST", `/api/cabinet/releases/${encodeURIComponent(releaseId)}/tracks`)
    xhr.withCredentials = true
    xhr.send(fd)
  })
}
