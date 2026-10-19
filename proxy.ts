import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  getMaintenanceBypassSecret,
  getMaintenanceRetryAfterSeconds,
  isMaintenanceModeEnabled,
  MAINTENANCE_BYPASS_COOKIE,
  MAINTENANCE_BYPASS_QUERY,
} from "@/lib/maintenance"
import {
  getConfiguredSmartlinkOrigin,
  isSmartlinkHostSlugSegment,
  isSmartlinkPublicHost,
  usesDedicatedSmartlinkHost,
} from "@/lib/smartlink-public-origin"

function requestHost(request: NextRequest): string {
  return (request.headers.get("host") || request.nextUrl.hostname || "").split(":")[0].toLowerCase()
}

function handleSmartlinkHost(request: NextRequest): NextResponse {
  const host = requestHost(request)
  const { pathname } = request.nextUrl
  const configured = getConfiguredSmartlinkOrigin()

  // Канон без www
  if (host.startsWith("www.") && configured) {
    const url = new URL(pathname + request.nextUrl.search, configured)
    return NextResponse.redirect(url, 308)
  }

  // Корневой лендинг short-домена (витрина конструктора)
  if (pathname === "/" || pathname === "") {
    const url = request.nextUrl.clone()
    url.pathname = "/prllx"
    return NextResponse.rewrite(url)
  }

  if (pathname === "/prllx" || pathname.startsWith("/prllx/")) {
    return NextResponse.next()
  }

  // /s/{slug}/... оставляем (OG image и т.п.); голый /s/{slug} → /{slug}
  const sExact = pathname.match(/^\/s\/([a-zA-Z0-9_-]{6,20})\/?$/)
  if (sExact) {
    const url = request.nextUrl.clone()
    url.pathname = `/${sExact[1]}`
    return NextResponse.redirect(url, 308)
  }

  if (pathname.startsWith("/s/")) {
    return NextResponse.next()
  }

  const rootSlug = pathname.match(/^\/([a-zA-Z0-9_-]{6,20})\/?$/)
  if (rootSlug && isSmartlinkHostSlugSegment(rootSlug[1])) {
    const url = request.nextUrl.clone()
    url.pathname = `/s/${rootSlug[1]}`
    return NextResponse.rewrite(url)
  }

  // На short-домене нет кабинета/сайта
  return new NextResponse("Not Found", { status: 404 })
}

function handleMainHostSmartlinkRedirect(request: NextRequest): NextResponse | null {
  if (!usesDedicatedSmartlinkHost()) return null
  const configured = getConfiguredSmartlinkOrigin()
  if (!configured) return null

  const { pathname } = request.nextUrl
  const m = pathname.match(/^\/s\/([a-zA-Z0-9_-]{6,20})\/?$/)
  if (!m) return null

  const target = new URL(`/${m[1]}`, configured)
  target.search = request.nextUrl.search
  return NextResponse.redirect(target, 308)
}

/** Статика из public - не уводим на /maintenance (иначе <video>/<audio> получают HTML 503). */
function isPublicMediaPath(pathname: string): boolean {
  return /\.(?:mp4|webm|mp3|wav|ogg|m4a|aac)(?:$|\?)/i.test(pathname)
}

function handleMaintenance(request: NextRequest): NextResponse | null {
  if (!isMaintenanceModeEnabled()) return null

  const { pathname, searchParams } = request.nextUrl
  const bypassSecret = getMaintenanceBypassSecret()

  if (bypassSecret) {
    const queryBypass = searchParams.get(MAINTENANCE_BYPASS_QUERY)
    if (queryBypass === bypassSecret) {
      const cleanUrl = request.nextUrl.clone()
      cleanUrl.searchParams.delete(MAINTENANCE_BYPASS_QUERY)
      const res = NextResponse.redirect(cleanUrl)
      res.cookies.set(MAINTENANCE_BYPASS_COOKIE, bypassSecret, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24,
      })
      return res
    }

    if (request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value === bypassSecret) {
      return NextResponse.next()
    }
  }

  if (pathname === "/maintenance" || pathname === "/maintenance.html") {
    const res = NextResponse.next()
    res.headers.set("Retry-After", getMaintenanceRetryAfterSeconds())
    res.headers.set("Cache-Control", "no-store")
    return res
  }

  // Публичные смартлинки и медиа-примеры доступны и во время maintenance
  if (pathname.startsWith("/s/") || isPublicMediaPath(pathname) || pathname.startsWith("/videos/")) {
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  url.pathname = "/maintenance"
  url.search = ""

  return NextResponse.rewrite(url, {
    status: 503,
    headers: {
      "Retry-After": getMaintenanceRetryAfterSeconds(),
      "Cache-Control": "no-store",
    },
  })
}

export function proxy(request: NextRequest) {
  const host = requestHost(request)

  if (isSmartlinkPublicHost(host)) {
    return handleSmartlinkHost(request)
  }

  const smartlinkRedirect = handleMainHostSmartlinkRedirect(request)
  if (smartlinkRedirect) return smartlinkRedirect

  const maintenance = handleMaintenance(request)
  if (maintenance) return maintenance

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Всё, кроме:
     * - api (в т.ч. payment webhooks)
     * - _next/static, _next/image
     * - статика в public (изображения, видео, аудио, иконки, maintenance.html)
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|icon\\.svg|robots\\.txt|sitemap\\.xml|maintenance\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|mp4|webm|mp3|wav|ogg|m4a|aac)$).*)",
  ],
}
