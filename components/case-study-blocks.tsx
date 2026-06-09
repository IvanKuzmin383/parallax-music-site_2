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
