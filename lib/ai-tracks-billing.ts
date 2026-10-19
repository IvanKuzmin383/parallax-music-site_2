import { AI_TRACKS_PRICE_RUB } from "@/lib/ai-tracks-config"
import {
  debitWalletForServicePayment,
  refundWalletForServicePayment,
} from "@/lib/cabinet-balance"

export function aiTracksWalletOrderId(jobId: string): string {
  return `ai-tracks:${jobId}`
}

export async function chargeAiTracksGeneration(params: {
  userId: string
  jobId: string
  priceRub?: number
}) {
  const amount = params.priceRub ?? AI_TRACKS_PRICE_RUB
  return debitWalletForServicePayment({
    userId: params.userId,
    amount,
    orderId: aiTracksWalletOrderId(params.jobId),
    note: `AI-генерация музыки (${params.jobId})`,
  })
}

export async function refundAiTracksGeneration(params: {
  userId: string
  jobId: string
  priceRub?: number
}) {
  const amount = params.priceRub ?? AI_TRACKS_PRICE_RUB
  return refundWalletForServicePayment({
    userId: params.userId,
    amount,
    orderId: aiTracksWalletOrderId(params.jobId),
    note: `Возврат AI-генерации (${params.jobId})`,
  })
}
