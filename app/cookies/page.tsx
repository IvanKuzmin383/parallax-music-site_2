import { readFile } from "fs/promises"
import { join } from "path"
import { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal-document-page"

export const metadata: Metadata = {
  title: "Политика использования файлов cookie",
  description: "Информация об использовании файлов cookie на сайте Parallax Music.",
}

async function getCookiePolicyContent(): Promise<string> {
  const filePath = join(process.cwd(), "data", "cookie-policy.md")
  return readFile(filePath, "utf-8")
}

export default async function CookiePolicyPage() {
  const content = await getCookiePolicyContent()
  return <LegalDocumentPage content={content} />
}
