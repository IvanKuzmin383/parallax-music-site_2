import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getAllWithdrawalRequests } from "@/lib/withdrawal-requests"
import { getAllCabinetUsers } from "@/lib/cabinet-users"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const requests = await getAllWithdrawalRequests()
    const users = await getAllCabinetUsers()
    
    // Обогащаем заявки информацией о пользователях
    const enrichedRequests = requests.map((request) => {
      const user = users.find((u) => u.id === request.userId)
      return {
        ...request,
        userEmail: user?.email || "Неизвестный пользователь",
      }
    })
    
    // Сортируем по дате создания (новые сначала)
    enrichedRequests.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    
    return NextResponse.json({ requests: enrichedRequests })
  } catch (error) {
    console.error("Error fetching withdrawal requests:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить заявки на вывод" },
      { status: 500 }
    )
  }
}
