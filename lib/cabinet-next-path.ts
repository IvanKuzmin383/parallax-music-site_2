/**
 * Разрешённый внутренний редирект после логина (?next=...).
 * Только пути кабинета, без open-redirect.
 */
export function sanitizeCabinetNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  let path = raw.trim()
  try {
    // на случай полного URL с того же origin - берём pathname+search
    if (path.includes("://")) {
      const u = new URL(path)
      path = `${u.pathname}${u.search}`
    }
  } catch {
    return null
  }
  if (!path.startsWith("/cabinet")) return null
  if (path.startsWith("//")) return null
  if (path.includes("://")) return null
  return path
}
