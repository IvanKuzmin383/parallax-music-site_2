import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  getMaintenanceBypassSecret,
  getMaintenanceRetryAfterSeconds,
  isMaintenanceModeEnabled,
  MAINTENANCE_BYPASS_COOKIE,
  MAINTENANCE_BYPASS_QUERY,
} from "@/lib/maintenance"

export function proxy(request: NextRequest) {
  if (!isMaintenanceModeEnabled()) {
    return NextResponse.next()
  }

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

  const url = request.nextUrl.clone()
  url.pathname = "/maintenance"
  url.search = ""

  const res = NextResponse.rewrite(url, {
    status: 503,
    headers: {
      "Retry-After": getMaintenanceRetryAfterSeconds(),
      "Cache-Control": "no-store",
    },
  })
  return res
}

export const config = {
  matcher: [
    /*
     * Всё, кроме:
     * - api (в т.ч. payment webhooks)
     * - _next/static, _next/image
     * - статика в public (изображения, иконки, maintenance.html)
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|icon\\.svg|robots\\.txt|sitemap\\.xml|maintenance\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
}
