/** Переиспользуемые блоки для страниц кейсов (вёрстка из Canvas). */

import { cn } from "@/lib/utils"

export type CaseStatItem = {
  value: string
  label: string
  tone?: "default" | "success" | "info"
}

export function CaseSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{title}</h2>
      <div className="space-y-4 text-base leading-relaxed">{children}</div>
    </section>
  )
}

export function CaseFigure({
  src,
  alt,
  caption,
}: {
  src: string
  alt: string
  caption?: string
}) {
  return (
    <figure className="my-6">
      <img src={src} alt={alt} className="w-full rounded-lg border border-border" />
      {caption && (
        <figcaption className="text-sm text-muted-foreground text-center mt-2 italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

export function CaseQuote({ text, author }: { text: string; author: string }) {
  return (
    <blockquote className="border-l-4 border-primary pl-6 py-2 my-8 italic text-foreground text-lg">
      <p>«{text}»</p>
      <footer className="text-sm text-muted-foreground mt-3 not-italic">— {author}</footer>
    </blockquote>
  )
}

export function CaseTable({
  headers,
  rows,
  caption,
}: {
  headers: string[]
  rows: string[][]
  caption?: string
}) {
  return (
    <div className="overflow-x-auto my-6">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {headers.map((h) => (
              <th key={h} className="text-left py-3 px-4 font-semibold text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50">
              {row.map((cell, j) => (
                <td key={j} className="py-3 px-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {caption && <p className="text-xs text-muted-foreground mt-2">{caption}</p>}
    </div>
  )
}

export function CaseStatGrid({
  items,
  columns = 4,
}: {
  items: CaseStatItem[]
  columns?: 2 | 3 | 4
}) {
  const colClass =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-2 md:grid-cols-3"
        : "grid-cols-2 md:grid-cols-4"

  return (
    <div className={cn("grid gap-4 my-6", colClass)}>
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-card p-4">
          <p
            className={cn(
              "text-xl md:text-2xl font-bold tabular-nums",
              item.tone === "success" && "text-primary",
              item.tone === "info" && "text-foreground",
              !item.tone && "text-foreground",
            )}
          >
            {item.value}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{item.label}</p>
        </div>
      ))}
    </div>
  )
}

export function CaseCardGrid({
  items,
}: {
  items: { title: string; body: string }[]
}) {
  return (
    <div className="grid md:grid-cols-3 gap-4 my-6">
      {items.map((item) => (
        <div key={item.title} className="rounded-lg border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
          <p className="text-sm leading-relaxed">{item.body}</p>
        </div>
      ))}
    </div>
  )
}

export function CaseColumns({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-2 gap-6 my-6">{children}</div>
}

/** Демо-график до загрузки скриншота. Замените на CaseFigure со скрином. */
export function CaseBarChartPreview({
  title,
  caption,
  data,
}: {
  title: string
  caption?: string
  data: { label: string; value: number }[]
}) {
  const max = Math.max(...data.map((d) => d.value), 1)

  const formatValue = (value: number) =>
    value >= 1000 ? `${Math.round(value / 1000)}K` : String(value)

  return (
    <figure className="my-6 rounded-lg border border-border bg-card p-6">
      <p className="text-sm font-medium text-foreground mb-6">{title}</p>
      <div className="flex items-end justify-between gap-2 h-44 px-2">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
            <span className="text-xs font-medium text-primary tabular-nums">
              {formatValue(d.value)}
            </span>
            <div
              className="w-full max-w-[48px] bg-primary rounded-t transition-all"
              style={{ height: `${Math.round((d.value / max) * 100)}%`, minHeight: "8px" }}
            />
            <span className="text-xs text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
      {caption && (
        <figcaption className="text-sm text-muted-foreground text-center mt-4 italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

export function CaseHorizontalBarChartPreview({
  title,
  caption,
  data,
  valueSuffix = "",
}: {
  title: string
  caption?: string
  data: { label: string; value: number }[]
  valueSuffix?: string
}) {
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <figure className="my-6 rounded-lg border border-border bg-card p-6">
      <p className="text-sm font-medium text-foreground mb-4">{title}</p>
      <div className="space-y-4">
        {data.map((d) => (
          <div key={d.label}>
            <div className="flex justify-between gap-3 text-xs mb-1.5">
              <span className="text-muted-foreground">{d.label}</span>
              <span className="font-medium text-foreground tabular-nums shrink-0">
                {d.value.toLocaleString("ru-RU")}
                {valueSuffix}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.round((d.value / max) * 100)}%`, minWidth: "4px" }}
              />
            </div>
          </div>
        ))}
      </div>
      {caption && (
        <figcaption className="text-sm text-muted-foreground text-center mt-4 italic">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}
