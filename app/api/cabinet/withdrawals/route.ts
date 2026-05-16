import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getWithdrawalRequestsByUserId } from "@/lib/withdrawal-requests"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    const user = await getCabinetUserByEmail(session.email)
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    const requests = await getWithdrawalRequestsByUserId(user.id)
    
    // Возвращаем только безопасные данные (без чувствительной информации)
    const safeRequests = requests.map((req) => ({
      id: req.id,
      amount: req.amount,
      type: req.type,
      phone: req.type === "sbp" ? req.phone : undefined,
      cardNumber: req.type === "card" ? req.cardNumber : undefined,
      bank: req.type === "card" ? req.bank : undefined,
      recipientName: req.recipientName,
      status: req.status,
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
    }))
    
    return NextResponse.json({ requests: safeRequests })
  } catch (error) {
    console.error("Error fetching withdrawal requests:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить заявки на вывод" },
      { status: 500 }
    )
  }
}
