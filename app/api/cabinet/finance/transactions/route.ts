import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  BALANCE_TRANSACTION_LABELS,
  listBalanceTransactions,
} from "@/lib/cabinet-balance"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const transactions = await listBalanceTransactions(user.id)
  return NextResponse.json({
    transactions: transactions.map((t) => ({
      ...t,
      typeLabel: BALANCE_TRANSACTION_LABELS[t.type] ?? t.type,
    })),
  })
}
