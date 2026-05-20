import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { CopyProtected } from "@/components/copy-protected"

type LegalDocumentPageProps = {
  content: string
}

export function LegalDocumentPage({ content }: LegalDocumentPageProps) {
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

          <CopyProtected className="prose prose-lg dark:prose-invert max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:my-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </CopyProtected>
        </div>
      </article>
    </main>
  )
}
