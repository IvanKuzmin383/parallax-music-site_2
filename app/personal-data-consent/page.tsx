import { readFile } from "fs/promises"
import { join } from "path"
import { Metadata } from "next"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

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

  return (
    <main className="min-h-screen bg-background pt-20">
      <article className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <span aria-hidden="true">←</span>
              <span>На главную</span>
            </Link>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:my-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </article>
    </main>
  )
}
