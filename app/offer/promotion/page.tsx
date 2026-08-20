import { readFile } from "fs/promises"
import { join } from "path"
import { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal-document-page"

export const metadata: Metadata = {
  title: "Публичная оферта на продвижение музыкальных релизов",
  description:
    "Публичная оферта Parallax Music на оказание услуг по продвижению музыкальных релизов.",
}

async function getPromotionOfferContent(): Promise<string> {
  const filePath = join(process.cwd(), "data", "promotion-offer.md")
  return readFile(filePath, "utf-8")
}

export default async function PromotionOfferPage() {
  const content = await getPromotionOfferContent()
  return <LegalDocumentPage content={content} />
}
