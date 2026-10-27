"use client"

import { Fragment, type MouseEvent, type ReactNode } from "react"
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

function stopRowNavigation(e: MouseEvent) {
  e.stopPropagation()
}

/** Простой текст с кликабельными http(s)/www ссылками (без markdown). */
export function LinkifiedText({
  text,
  className,
}: {
  text: string
  className?: string
}): ReactNode {
  const parts: ReactNode[] = []
  const re = new RegExp(URL_PATTERN.source, URL_PATTERN.flags)
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={`t-${key++}`}>{text.slice(lastIndex, match.index)}</Fragment>
      )
    }
    const { href, display } = trimTrailingUrlPunctuation(match[0])
    const trailing = match[0].slice(display.length)
    parts.push(
      <a
        key={`a-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
        onClick={stopRowNavigation}
      >
        {display}
      </a>
    )
    if (trailing) {
      parts.push(<Fragment key={`p-${key++}`}>{trailing}</Fragment>)
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push(<Fragment key={`t-${key++}`}>{text.slice(lastIndex)}</Fragment>)
  }
  return <span className={className}>{parts.length > 0 ? parts : text}</span>
}

/** true, если клик по ссылке внутри строки уведомления (не навигировать строкой). */
export function isClickOnLink(e: MouseEvent): boolean {
  return Boolean((e.target as HTMLElement | null)?.closest?.("a"))
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
        onClick={stopRowNavigation}
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
