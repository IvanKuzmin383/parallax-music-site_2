import { readFile } from "fs/promises"
import { join } from "path"
import { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal-document-page"

export const metadata: Metadata = {
  title: "Условия использования",
  description: "Условия использования сайта Parallax Music.",
}

async function getTermsContent(): Promise<string> {
  const filePath = join(process.cwd(), "data", "terms-of-use.md")
  return readFile(filePath, "utf-8")
}

export default async function TermsPage() {
  const content = await getTermsContent()
  return <LegalDocumentPage content={content} />
}
