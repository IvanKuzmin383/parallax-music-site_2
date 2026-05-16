import { NextRequest, NextResponse } from "next/server"
import { createHash } from "node:crypto"

function getFingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12)
}

function getMasked(value: string): string {
  if (value.length <= 8) return "***"
  return `${value.slice(0, 4)}...${value.slice(-4)}`
}

export async function GET(request: NextRequest) {
  const debugToken = process.env.EMAIL_HEALTH_DEBUG_TOKEN
  const providedToken = request.nextUrl.searchParams.get("token")

  if (!debugToken || providedToken !== debugToken) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const resendApiKey = process.env.RESEND_API_KEY ?? ""
  const resendFromEmail = process.env.RESEND_FROM_EMAIL ?? "Parallax Music <onboarding@resend.dev>"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? null

  const keyPresent = resendApiKey.length > 0
  const keyPrefix = keyPresent ? resendApiKey.slice(0, 3) : null
  const keyMasked = keyPresent ? getMasked(resendApiKey) : null
  const keyFingerprint = keyPresent ? getFingerprint(resendApiKey) : null

  let resendProbe: Record<string, unknown> = {
    checked: false,
  }

  if (keyPresent) {
    try {
      const response = await fetch("https://api.resend.com/domains", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      let body: unknown = null
      try {
        body = await response.json()
      } catch {
        body = null
      }

      resendProbe = {
        checked: true,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        body,
      }
    } catch (error) {
      resendProbe = {
        checked: true,
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  return NextResponse.json(
    {
      ok: true,
      nowIso: new Date().toISOString(),
      env: {
        siteUrl,
        resendFromEmail,
        emailHealthDebugTokenConfigured: Boolean(debugToken),
      },
      resend: {
        keyPresent,
        keyPrefix,
        keyMasked,
        keyFingerprint,
        probe: resendProbe,
      },
      hints: [
        "If keyFingerprint differs between local and server, server uses a different key.",
        "HTTP 401/403 usually means wrong or revoked API key.",
        "HTTP 404 with 'Application not found' indicates key/app mismatch in Resend workspace.",
      ],
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  )
}
