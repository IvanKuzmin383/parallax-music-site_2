import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  isServicePriceKey,
  listResolvedServicePrices,
  resetServicePrice,
  upsertServicePrice,
} from "@/lib/service-prices"

const patchSchema = z.object({
  key: z.string().trim().min(1),
  priceRub: z.number().positive().max(1_000_000).optional(),
  compareAtRub: z.number().positive().max(1_000_000).nullable().optional(),
  reset: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const items = await listResolvedServicePrices()
    return NextResponse.json({ items })
  } catch (error) {
    console.error("[admin/service-prices] GET", error)
    return NextResponse.json({ error: "Не удалось загрузить цены" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success || !isServicePriceKey(parsed.data.key)) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })
  }

  try {
    if (parsed.data.reset) {
      const item = await resetServicePrice(parsed.data.key)
      return NextResponse.json({ item })
    }

    if (parsed.data.priceRub == null) {
      return NextResponse.json({ error: "Укажите priceRub" }, { status: 400 })
    }

    const item = await upsertServicePrice({
      key: parsed.data.key,
      priceRub: parsed.data.priceRub,
      compareAtRub: parsed.data.compareAtRub,
    })
    return NextResponse.json({ item })
  } catch (error) {
    console.error("[admin/service-prices] PATCH", error)
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 })
  }
}
