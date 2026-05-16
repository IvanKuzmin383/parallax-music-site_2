import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  deleteCabinetArtistSubscriptionSlot,
  listCabinetArtistSubscriptionsByUserId,
  updateCabinetArtistSubscriptionSlot,
} from "@/lib/cabinet-artist-subscriptions"
import { getCabinetUserById } from "@/lib/cabinet-users"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-plans"

const patchSchema = z.object({
  artistName: z.string().optional().nullable(),
  subscriptionName: z.enum([...SUBSCRIPTION_PLANS]).optional(),
  subscriptionExpiresAt: z.string().optional().nullable(),
  subscriptionTrackLimit: z.number().int().positive().optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slotId: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id, slotId } = await params
  const user = await getCabinetUserById(id)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const userSlots = await listCabinetArtistSubscriptionsByUserId(id)
  if (!userSlots.some((s) => s.id === slotId)) {
    return NextResponse.json({ error: "Слот не найден" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 })
  }

  const slot = await updateCabinetArtistSubscriptionSlot(slotId, parsed.data)
  if (!slot) {
    return NextResponse.json({ error: "Слот не найден" }, { status: 404 })
  }
  return NextResponse.json({ slot })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slotId: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { id, slotId } = await params
  const user = await getCabinetUserById(id)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }
  const userSlots = await listCabinetArtistSubscriptionsByUserId(id)
  if (!userSlots.some((s) => s.id === slotId)) {
    return NextResponse.json({ error: "Слот не найден" }, { status: 404 })
  }
  const ok = await deleteCabinetArtistSubscriptionSlot(slotId)
  if (!ok) {
    return NextResponse.json({ error: "Слот не найден" }, { status: 404 })
  }
  return NextResponse.json({ success: true })
}
