/** Разбор ссылки на карточку заказа услуг: /cabinet/orders/:id */
export function parseCabinetOrderDetailHref(
  href: string | null | undefined
): { orderId: string } | null {
  if (!href) return null
  try {
    const url = new URL(href, "http://local")
    const m = url.pathname.match(/^\/cabinet\/orders\/([^/]+)$/)
    if (!m?.[1] || m[1] === "new") return null
    return { orderId: decodeURIComponent(m[1]) }
  } catch {
    return null
  }
}

/** Проверка: заказ есть в разделе «Заказы» (услуги), иначе ссылка ведёт в тупик. */
export async function cabinetServiceOrderExists(orderId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/cabinet/service-fulfillments?orderId=${encodeURIComponent(orderId)}`,
      { credentials: "include", cache: "no-store" }
    )
    if (!res.ok) return false
    const data = (await res.json()) as { exists?: boolean }
    return data.exists === true
  } catch {
    return false
  }
}
