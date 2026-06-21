import type { CaseStudyMeta } from "@/data/cases"
import {
  buildCaseStudyArticleJsonLd,
  buildCaseStudyBreadcrumbJsonLd,
} from "@/lib/case-seo"

export function CaseStudyJsonLd({
  slug,
  meta,
}: {
  slug: string
  meta: CaseStudyMeta
}) {
  const articleLd = buildCaseStudyArticleJsonLd(slug, meta)
  const breadcrumbLd = buildCaseStudyBreadcrumbJsonLd(slug, meta.title)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
    </>
  )
}
