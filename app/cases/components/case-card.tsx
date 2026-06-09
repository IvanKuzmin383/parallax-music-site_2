import Link from "next/link"
import type { CaseStudyMeta } from "@/data/cases"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CaseCardProps {
  caseStudy: CaseStudyMeta
}

export function CaseCard({ caseStudy }: CaseCardProps) {
  return (
    <Link href={`/cases/${caseStudy.slug}`} className="block h-full group">
      <Card className="h-full flex flex-col overflow-hidden transition-shadow group-hover:shadow-lg">
        {caseStudy.coverImage && (
          <div className="relative w-full aspect-video bg-muted shrink-0">
            <img
              src={caseStudy.coverImage}
              alt=""
              className="object-cover w-full h-full"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
        <CardHeader className="flex-1">
          <span className="text-xs text-primary uppercase tracking-wider font-medium">
            {caseStudy.artistName}
            {caseStudy.genre ? ` · ${caseStudy.genre}` : ""}
          </span>
          <CardTitle className="line-clamp-2 mt-1">{caseStudy.title}</CardTitle>
          {caseStudy.excerpt && (
            <CardDescription className="line-clamp-3 mt-2">{caseStudy.excerpt}</CardDescription>
          )}
        </CardHeader>
        {caseStudy.services && caseStudy.services.length > 0 && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {caseStudy.services.slice(0, 3).map((service) => (
                <span
                  key={service}
                  className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded"
                >
                  {service}
                </span>
              ))}
            </div>
          </CardContent>
        )}
        <div className="px-6 pb-6 pt-0 mt-auto">
          <span className="inline-flex w-full items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium uppercase tracking-wider group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
            Читать
          </span>
        </div>
      </Card>
    </Link>
  )
}
