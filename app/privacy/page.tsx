import { readFile } from "fs/promises"
import { join } from "path"
import { Metadata } from "next"
import { LegalDocumentPage } from "@/components/legal-document-page"

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  description: "Информация об обработке персональных данных на сайте Parallax Music.",
}

async function getPrivacyPolicyContent(): Promise<string> {
  const filePath = join(process.cwd(), "data", "privacy-policy.md")
  return readFile(filePath, "utf-8")
}

export default async function PrivacyPolicyPage() {
  const content = await getPrivacyPolicyContent()
  return <LegalDocumentPage content={content} />
}
