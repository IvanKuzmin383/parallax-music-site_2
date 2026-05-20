import { readFile } from "fs/promises"
import { join } from "path"
import { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal-document-page"

export const metadata: Metadata = {
  title: "Согласие на обработку персональных данных",
  description:
    "Согласие субъекта персональных данных на обработку ПДн при использовании сайта и личного кабинета Parallax Music.",
}

async function getConsentContent(): Promise<string> {
  const filePath = join(process.cwd(), "data", "personal-data-consent.md")
  return readFile(filePath, "utf-8")
}

export default async function PersonalDataConsentPage() {
  const content = await getConsentContent()
  return <LegalDocumentPage content={content} />
}
