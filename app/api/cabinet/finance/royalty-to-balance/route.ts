import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { transferRoyaltyToWallet } from "@/lib/cabinet-balance"

const bodySchema = z.object({
  amount: z.number().positive().finite(),
})

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Укажите корректную сумму" }, { status: 400 })
  }

  const result = await transferRoyaltyToWallet({
    userEmail: session.email,
    amount: parsed.data.amount,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    ok: true,
    amount: result.amount,
    streamingBalance: result.streamingBalance,
    walletBalance: result.walletBalance,
    transaction: result.transaction,
  })
}
