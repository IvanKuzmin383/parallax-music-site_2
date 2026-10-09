import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  countUnreadSupportThreadsForAdmin,
  listSupportThreads,
  type SupportThreadStatus,
} from "@/lib/support-chat"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const statusParam = request.nextUrl.searchParams.get("status")
    const status: SupportThreadStatus | "all" =
      statusParam === "open" || statusParam === "closed" || statusParam === "all"
        ? statusParam
        : "all"

    const [threads, unreadThreads] = await Promise.all([
      listSupportThreads({ status }),
      countUnreadSupportThreadsForAdmin(),
    ])

    return NextResponse.json({ threads, unreadThreads })
  } catch (error) {
    console.error("[admin/support/threads] GET failed:", error)
    return NextResponse.json({ error: "Не удалось загрузить диалоги" }, { status: 500 })
  }
}
