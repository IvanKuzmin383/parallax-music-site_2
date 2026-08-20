import { readFile } from "fs/promises"
import { join } from "path"
import { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal-document-page"

export const metadata: Metadata = {
  title: "Публичная оферта на размещение в плейлистах",
  description:
    "Публичная оферта Parallax Music на оказание услуг по размещению музыкальных релизов в плейлистах.",
}

async function getPlaylistOfferContent(): Promise<string> {
  const filePath = join(process.cwd(), "data", "playlist-placement-offer.md")
  return readFile(filePath, "utf-8")
}

export default async function PlaylistOfferPage() {
  const content = await getPlaylistOfferContent()
  return <LegalDocumentPage content={content} />
}
