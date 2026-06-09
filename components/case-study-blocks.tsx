/** Переиспользуемые блоки для страниц кейсов (вёрстка из Canvas). */

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
