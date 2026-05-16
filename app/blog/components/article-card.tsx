import Link from "next/link"
import { Article, getDisplayDate } from "@/lib/articles"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ArticleCardProps {
  article: Article
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link href={`/blog/${article.slug}`}>
      <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
        {article.ogImage && (
          <div className="relative w-full aspect-video bg-muted shrink-0">
            <img
              src={article.ogImage}
              alt=""
              className="object-cover w-full h-full"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
              {article.category}
            </span>
            <time className="text-xs text-muted-foreground">
              {format(new Date(getDisplayDate(article)), "MMM d, yyyy")}
            </time>
          </div>
          <CardTitle className="line-clamp-2">{article.title}</CardTitle>
          {article.excerpt && (
            <CardDescription className="line-clamp-3 mt-2">
              {article.excerpt}
            </CardDescription>
          )}
        </CardHeader>
        {article.tags.length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {article.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </Link>
  )
}
