import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getWithdrawalRequestById, updateWithdrawalRequestStatus } from "@/lib/withdrawal-requests"
import { getCabinetUserById, updateCabinetUserBalance } from "@/lib/cabinet-users"

const updateStatusSchema = z.object({
  status: z.enum(["pending", "rejected", "completed"]),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { status } = updateStatusSchema.parse(body)
    
    const withdrawalRequest = await getWithdrawalRequestById(id)
    if (!withdrawalRequest) {
      return NextResponse.json(
        { error: "Заявка не найдена" },
        { status: 404 }
      )
    }

    // Если статус меняется на "completed", списываем средства с баланса пользователя
    if (status === "completed" && withdrawalRequest.status !== "completed") {
      const user = await getCabinetUserById(withdrawalRequest.userId)
      if (user) {
        const currentBalance = user.streamingBalance || 0
        if (currentBalance >= withdrawalRequest.amount) {
          await updateCabinetUserBalance(
            withdrawalRequest.userId,
            currentBalance - withdrawalRequest.amount
          )
        } else {
          return NextResponse.json(
            { error: "Недостаточно средств на балансе пользователя" },
            { status: 400 }
          )
        }
      }
    }

    // Если статус меняется с "completed" на другой, возвращаем средства
    if (withdrawalRequest.status === "completed" && status !== "completed") {
      const user = await getCabinetUserById(withdrawalRequest.userId)
      if (user) {
        const currentBalance = user.streamingBalance || 0
        await updateCabinetUserBalance(
          withdrawalRequest.userId,
          currentBalance + withdrawalRequest.amount
        )
      }
    }

    const updated = await updateWithdrawalRequestStatus(id, status)
    
    if (!updated) {
      return NextResponse.json(
        { error: "Не удалось обновить статус заявки" },
        { status: 500 }
      )
    }

    return NextResponse.json({ request: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Ошибка валидации данных", errors: error.errors },
        { status: 400 }
      )
    }
    
    console.error("Error updating withdrawal request status:", error)
    return NextResponse.json(
      { error: "Не удалось обновить статус заявки" },
      { status: 500 }
    )
  }
}
