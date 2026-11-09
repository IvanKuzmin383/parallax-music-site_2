import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ArrowUpRight } from "lucide-react"
import { Article, getDisplayDate } from "@/lib/articles"
import {
  marketingGlassHoverClass,
  marketingGlassPanelClass,
} from "@/components/marketing/marketing-glass"
import { cn } from "@/lib/utils"

interface ArticleCardProps {
  article: Article
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      prefetch={false}
      className={cn(
        marketingGlassPanelClass,
        marketingGlassHoverClass,
        "group flex h-full flex-col overflow-hidden",
      )}
    >
      {article.ogImage ? (
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted/40">
          <img
            src={article.ogImage}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {article.category}
          </span>
          <time className="text-xs text-muted-foreground">
            {format(new Date(getDisplayDate(article)), "d MMM yyyy", { locale: ru })}
          </time>
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
            <span className="line-clamp-2">{article.title}</span>
          </h2>
          {article.excerpt ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
              {article.excerpt}
            </p>
          ) : null}
        </div>

        {article.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
          Читать
          <ArrowUpRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  )
}
