import Link from "next/link"
import type { CaseStudyMeta } from "@/data/cases"

export type CaseMetric = {
  label: string
  value: string
  hint?: string
}

interface CaseStudyLayoutProps {
  meta: Pick<CaseStudyMeta, "title" | "artistName" | "genre" | "coverImage" | "excerpt" | "services">
  metrics?: CaseMetric[]
  children: React.ReactNode
}

export function CaseStudyLayout({ meta, metrics, children }: CaseStudyLayoutProps) {
  return (
    <main className="min-h-screen bg-background pt-20">
      <article className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 space-y-2">
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <span aria-hidden="true">←</span>
              <span>Назад к кейсам</span>
            </Link>
            <nav className="text-sm text-muted-foreground flex flex-wrap items-center gap-1">
              <Link href="/cases" className="hover:text-primary transition-colors">
                Кейсы
              </Link>
              <span className="text-muted-foreground/70">/</span>
              <span className="text-foreground line-clamp-1">{meta.title}</span>
            </nav>
          </div>

          {meta.coverImage && (
            <div className="relative w-full aspect-video max-h-[420px] rounded-lg overflow-hidden bg-muted mb-8">
              <img
                src={meta.coverImage}
                alt=""
                className="object-cover w-full h-full"
                sizes="(max-width: 1024px) 100vw, 896px"
              />
            </div>
          )}

          <header className="mb-10">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-sm text-primary uppercase tracking-wider font-medium">
                {meta.artistName}
              </span>
              {meta.genre && (
                <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded">
                  {meta.genre}
                </span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{meta.title}</h1>
            {meta.excerpt && (
              <p className="text-xl text-muted-foreground mb-6">{meta.excerpt}</p>
            )}
            {meta.services && meta.services.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {meta.services.map((service) => (
                  <span
                    key={service}
                    className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded"
                  >
                    {service}
                  </span>
                ))}
              </div>
            )}
          </header>

          {metrics && metrics.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-lg border border-border bg-card p-4 text-center"
                >
                  <p className="text-2xl md:text-3xl font-bold text-primary">{m.value}</p>
                  <p className="text-sm font-medium mt-1">{m.label}</p>
                  {m.hint && <p className="text-xs text-muted-foreground mt-1">{m.hint}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-10 text-muted-foreground">{children}</div>

          <div className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-muted-foreground mb-4">Хотите такой же результат?</p>
            <Link
              href="/#contact"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Связаться с нами
            </Link>
          </div>
        </div>
      </article>
    </main>
  )
}
