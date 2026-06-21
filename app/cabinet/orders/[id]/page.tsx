"use client"

import { use } from "react"
import { OrderDetailPageContent } from "@/components/cabinet/orders/order-detail-page-content"

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <OrderDetailPageContent orderId={id} />
}
