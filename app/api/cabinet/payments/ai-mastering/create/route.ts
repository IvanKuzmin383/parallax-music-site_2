import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { createOrder, updateOrderStatus } from "@/lib/orders"
import { AI_MASTERING_PRICE_RUB, MAX_AI_MASTERING_TRACKS } from "@/lib/ai-mastering-pricing"
import { getUploadsBasePath } from "@/lib/tracks"
import { validateWavStereoFromPrefix } from "@/lib/wav-parse-stereo"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import {
  MultipartRequestError,
  ParsedMultipartFile,
  parseMultipartRequestStream,
  readFilePrefix,
} from "@/lib/node-streaming-multipart"

const YOOKASSA_API = "https://api.yookassa.ru/v3/payments"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_WAV_BYTES = 80 * 1024 * 1024

async function persistAiMasteringWavs(orderId: string, files: ParsedMultipartFile[]): Promise<void> {
  const base = await getUploadsBasePath()
  const dir = path.join(base, "ai-mastering-orders", orderId)
  await fs.mkdir(dir, { recursive: true })
  for (let i = 0; i < files.length; i++) {
    await copyFileToPathAtomic(files[i].tempFilePath, path.join(dir, `track-${i + 1}.wav`))
  }
}

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY
  if (!shopId || !secretKey) {
    console.error(
      "[payments/ai-mastering/create] Missing YOOKASSA env (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY)"
    )
    return NextResponse.json({ error: "Оплата временно недоступна" }, { status: 500 })
  }

  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru").replace(/\/$/, "")

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const contentType = request.headers.get("content-type") || ""
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Ожидается multipart/form-data" }, { status: 400 })
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: MAX_AI_MASTERING_TRACKS,
      maxFields: 20,
      maxFileSizeBytes: MAX_WAV_BYTES,
      maxFieldSizeBytes: 64 * 1024,
    })
    try {
      const consentRaw = multipart.getField("consentOfferLicense")
      if (consentRaw !== "true") {
        return NextResponse.json(
          {
            error:
              "Необходимо подтвердить согласие и ознакомление с публичной офертой и лицензионными условиями",
          },
          { status: 400 }
        )
      }

      const tracksCountRaw = multipart.getField("tracksCount")
      const tracksCount = tracksCountRaw ? parseInt(tracksCountRaw, 10) : NaN
  if (
    !Number.isInteger(tracksCount) ||
    Number.isNaN(tracksCount) ||
    tracksCount < 1 ||
    tracksCount > MAX_AI_MASTERING_TRACKS
  ) {
    return NextResponse.json(
      { error: `Количество треков должно быть от 1 до ${MAX_AI_MASTERING_TRACKS}` },
      { status: 400 }
    )
  }

      const wavFiles: ParsedMultipartFile[] = []
      for (let i = 0; i < tracksCount; i++) {
        const file = multipart.getFile(`audio_${i}`)
        if (!file) {
          return NextResponse.json(
            { error: `Прикрепите WAV-файл для позиции ${i + 1}` },
            { status: 400 }
          )
        }
        if (!file.originalFilename.toLowerCase().endsWith(".wav")) {
          return NextResponse.json(
            { error: `Позиция ${i + 1}: нужен файл в формате WAV` },
            { status: 400 }
          )
        }
        if (file.size > MAX_WAV_BYTES) {
          return NextResponse.json(
            { error: `Позиция ${i + 1}: размер WAV не более 80 MB` },
            { status: 400 }
          )
        }
        const stereoProbe = await readFilePrefix(file.tempFilePath, 512 * 1024)
        const stereoErr = validateWavStereoFromPrefix(new Uint8Array(stereoProbe))
        if (stereoErr) {
          return NextResponse.json({ error: `Позиция ${i + 1}: ${stereoErr}` }, { status: 400 })
        }
        wavFiles.push(file)
      }

      const contactEmailRaw = String(multipart.getField("contactEmail") ?? "").trim()
      const contactTelegramRaw = String(multipart.getField("contactTelegram") ?? "").trim()

  if (!contactEmailRaw && !contactTelegramRaw) {
    return NextResponse.json(
      { error: "Укажите email или Telegram для связи" },
      { status: 400 }
    )
  }

  if (contactEmailRaw && !EMAIL_REGEX.test(contactEmailRaw)) {
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 })
  }

  if (contactTelegramRaw && contactTelegramRaw.length < 2) {
    return NextResponse.json({ error: "Некорректный Telegram" }, { status: 400 })
  }

  const totalAmount = (tracksCount * AI_MASTERING_PRICE_RUB).toFixed(2)

  const order = await createOrder({
    orderType: "ai_mastering",
    userId: user.id,
    tracksCount,
    totalAmount,
    contactEmail: contactEmailRaw || undefined,
    contactTelegram: contactTelegramRaw || undefined,
  })

  try {
    await persistAiMasteringWavs(order.id, wavFiles)
  } catch (err) {
    console.error("[payments/ai-mastering/create] Failed to save WAV files:", order.id, err)
    return NextResponse.json(
      { error: "Не удалось сохранить файлы, попробуйте позже" },
      { status: 500 }
    )
  }

      const displayNames = wavFiles.map((f) => f.originalFilename.trim() || "track.wav")
  const trackTitlesJoined = displayNames.join(" | ")
  const trackSummary = trackTitlesJoined.slice(0, 200)
  const returnUrl = `${siteBase}/cabinet/promotion/ai-mastering?payment=return&orderId=${encodeURIComponent(order.id)}`

  const description = `AI мастеринг: ${trackSummary.slice(0, 60)}${trackSummary.length > 60 ? "…" : ""}, ${tracksCount} тр., ${user.email}`

  const idempotenceKey = crypto.randomUUID()
  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64")

  const yookassaBody = {
    amount: { value: totalAmount, currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect" as const, return_url: returnUrl },
    description: description.slice(0, 128),
    metadata: {
      orderId: order.id,
      orderType: "ai_mastering",
      userId: user.id,
      tracksCount: String(tracksCount),
      trackIds: "",
      trackTitles: trackTitlesJoined.slice(0, 1800),
      orderWithoutTrackSelection: "false",
      aiMasteringFilesPath: `ai-mastering-orders/${order.id}`,
      contactEmail: contactEmailRaw || "",
      contactTelegram: contactTelegramRaw || "",
      accountEmail: user.email,
    },
  }

  let res: Response
  try {
    res = await fetch(YOOKASSA_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
        "Idempotence-Key": idempotenceKey,
      },
      body: JSON.stringify(yookassaBody),
    })
  } catch (err) {
    console.error("[payments/ai-mastering/create] YooKassa request failed:", err)
    return NextResponse.json(
      { error: "Не удалось создать платёж, попробуйте позже" },
      { status: 500 }
    )
  }

  const data = (await res.json().catch(() => ({}))) as {
    id?: string
    confirmation?: { confirmation_url?: string }
    description?: string
    code?: string
  }

  if (!res.ok) {
    console.error("[payments/ai-mastering/create] YooKassa error:", res.status, data)
    return NextResponse.json(
      { error: data.description || "Не удалось создать платёж" },
      { status: 500 }
    )
  }

  const paymentId = data.id
  const confirmationUrl = data.confirmation?.confirmation_url

  if (!paymentId || !confirmationUrl) {
    console.error("[payments/ai-mastering/create] YooKassa response missing id or confirmation_url:", data)
    return NextResponse.json({ error: "Неверный ответ платёжной системы" }, { status: 500 })
  }

      await updateOrderStatus(order.id, "pending", { paymentId })

      return NextResponse.json({ confirmationUrl, paymentId })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[payments/ai-mastering/create] Unexpected error:", error)
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 })
  }
}
