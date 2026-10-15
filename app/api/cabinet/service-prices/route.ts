import { NextResponse } from "next/server"
import {
  formatServicePriceCardLabel,
  listResolvedServicePrices,
} from "@/lib/service-prices"

/** Публичные цены для карточек кабинета (без авторизации не требуется, но кабинет обычно с cookie). */
export async function GET() {
  try {
    const items = await listResolvedServicePrices()
    return NextResponse.json({
      items: items.map((p) => ({
        key: p.key,
        priceRub: p.priceRub,
        compareAtRub: p.compareAtRub,
        discountPercent: p.discountPercent,
        cardLabel: formatServicePriceCardLabel(p),
        unitHint: p.unitHint ?? null,
      })),
    })
  } catch (error) {
    console.error("[cabinet/service-prices] GET", error)
    return NextResponse.json({ error: "Не удалось загрузить цены" }, { status: 500 })
  }
}
