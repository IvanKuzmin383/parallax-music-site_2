import { readFile } from "fs/promises"
import { join } from "path"
import { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal-document-page"

export const metadata: Metadata = {
  title: "Публичная оферта и лицензионные условия",
  description:
    "Публичная оферта и лицензионные условия Parallax Music: услуги музыкальной дистрибуции и лицензия на фонограммы.",
}

async function getOfferContent(): Promise<string> {
  const filePath = join(process.cwd(), "data", "public-offer.md")
  return readFile(filePath, "utf-8")
}

export default async function OfferPage() {
  const content = await getOfferContent()
  return <LegalDocumentPage content={content} />
}
