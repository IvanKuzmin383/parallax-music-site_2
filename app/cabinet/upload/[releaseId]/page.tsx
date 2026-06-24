"use client"

import { Suspense } from "react"
import { useParams } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { ReleaseUploadWizard } from "@/components/cabinet/upload/release-upload-wizard"

function UploadReleasePageContent() {
  const params = useParams()
  const releaseId = typeof params.releaseId === "string" ? params.releaseId : undefined
  return <ReleaseUploadWizard releaseId={releaseId} />
}

export default function CabinetUploadReleasePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <UploadReleasePageContent />
    </Suspense>
  )
}
