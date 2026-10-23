"use client"

import { use } from "react"
import { StoryVideoClient } from "@/components/cabinet/tools/story-video/story-video-client"

export default function CabinetToolsStoryVideoEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <StoryVideoClient draftId={id} />
}
