"use client"

import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import { ReleaseUploadWizard } from "@/components/cabinet/upload/release-upload-wizard"

function UploadPageContent() {
  return <ReleaseUploadWizard />
}

export default function CabinetUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
          </div>
      }
    >
      <UploadPageContent />
    </Suspense>
  )
}
