import { Suspense } from "react"
import TracksPageClient from "./tracks-client"

export default function AdminTracksPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-20 flex items-center justify-center">
          <p>Загрузка...</p>
        </div>
      }
    >
      <TracksPageClient />
    </Suspense>
  )
}
