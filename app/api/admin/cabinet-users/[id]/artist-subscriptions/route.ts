import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  createCabinetArtistSubscriptionSlot,
  listCabinetArtistSubscriptionsByUserId,
} from "@/lib/cabinet-artist-subscriptions"
import { getCabinetUserById } from "@/lib/cabinet-users"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"

const createSchema = z.object({
  artistName: z.string().optional().nullable(),
  subscriptionName: z.enum([...SUBSCRIPTION_PLANS]),
  subscriptionExpiresAt: z.string().optional().nullable(),
  subscriptionTrackLimit: z.number().int().positive().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const user = await getCabinetUserById(id)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }
  const slots = await listCabinetArtistSubscriptionsByUserId(id)
  return NextResponse.json({ slots })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const user = await getCabinetUserById(id)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 })
  }

  const slot = await createCabinetArtistSubscriptionSlot({
    userId: id,
    artistName: parsed.data.artistName ?? null,
    subscriptionName: parsed.data.subscriptionName,
    subscriptionExpiresAt: parsed.data.subscriptionExpiresAt ?? null,
    subscriptionTrackLimit: parsed.data.subscriptionTrackLimit ?? null,
  })
  return NextResponse.json({ slot }, { status: 201 })
}
