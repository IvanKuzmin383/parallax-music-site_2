"use client"

import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

const URL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?)\]}]/gi

function trimTrailingUrlPunctuation(url: string): { href: string; display: string } {
  let display = url
  let href = url.startsWith("www.") ? `https://${url}` : url
  const trailing = /[.,;:!?)]+$/u
  const match = display.match(trailing)
  if (match) {
    display = display.slice(0, -match[0].length)
    href = href.slice(0, -match[0].length)
  }
  return { href, display }
}

function autolinkBareUrls(text: string): string {
  return text.replace(URL_PATTERN, (match) => {
    const { href, display } = trimTrailingUrlPunctuation(match)
    return `[${display}](${href})`
  })
}

const markdownComponents: Components = {
  a: ({ href, children }) => {
    if (!href || !/^https?:\/\//i.test(href)) {
      return <span>{children}</span>
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
      >
        {children}
      </a>
    )
  },
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
}

/** Сохраняет переносы строк из обычного текста при рендере Markdown. */
function preserveLineBreaks(text: string): string {
  return text.replace(/\n/g, "  \n")
}

type AnnouncementBodyProps = {
  body: string
  className?: string
}

export function AnnouncementBody({ body, className }: AnnouncementBodyProps) {
  const markdown = preserveLineBreaks(autolinkBareUrls(body))
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
