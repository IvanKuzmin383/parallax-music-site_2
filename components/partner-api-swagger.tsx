"use client"

import { useEffect, useRef, useState } from "react"
import "./partner-api-swagger.css"

declare global {
  interface Window {
    SwaggerUIBundle?: (options: Record<string, unknown>) => unknown
  }
}

const SWAGGER_BUNDLE = "/partner-api/swagger-ui/swagger-ui-bundle.js"
const SWAGGER_CSS = "/partner-api/swagger-ui/swagger-ui.css"

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(script)
  })
}

function loadStylesheet(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) return
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = href
  document.head.appendChild(link)
}

export function PartnerApiSwagger() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function mount() {
      try {
        // Local assets (CSP blocks unpkg/CDN script-src)
        loadStylesheet(SWAGGER_CSS)
        await loadScript(SWAGGER_BUNDLE)
        if (cancelled || !containerRef.current || !window.SwaggerUIBundle) return

        window.SwaggerUIBundle({
          url: "/partner-api/openapi.json",
          domNode: containerRef.current,
          deepLinking: true,
          docExpansion: "list",
          defaultModelsExpandDepth: 1,
          tryItOutEnabled: false,
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
        })
        setReady(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить Swagger UI")
      }
    }

    void mount()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="partner-swagger">
      {!ready && !error ? (
        <p className="text-sm text-muted-foreground px-4 py-8">Загрузка документации…</p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive px-4 py-8">
          {error}. Спецификация доступна по адресу{" "}
          <a className="underline" href="/partner-api/openapi.json">
            /partner-api/openapi.json
          </a>
          .
        </p>
      ) : null}
      <div ref={containerRef} />
    </div>
  )
}
