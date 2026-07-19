import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAdminToken, verifySession } from "@/lib/auth"
import { resolvePlatformLinksByUpc } from "@/lib/resolve-platform-links"

const bodySchema = z.object({
  upc: z.string().min(1).max(32),
})

export async function POST(request: NextRequest) {
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

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Укажите UPC", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const result = await resolvePlatformLinksByUpc(parsed.data.upc)
    if (!result.found) {
      return NextResponse.json(
        {
          error:
            "Ссылки не найдены. Релиз ещё не в каталогах площадок или UPC неверный.",
          ...result,
        },
        { status: 404 }
      )
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error("[admin] resolve-platform-links error:", error)
    return NextResponse.json({ error: "Ошибка при поиске ссылок" }, { status: 500 })
  }
}
