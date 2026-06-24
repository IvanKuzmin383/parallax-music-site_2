export type OrderDisplayStatus =
  | "draft"
  | "awaiting_payment"
  | "paid"
  | "in_progress"
  | "review"
  | "completed"
  | "cancelled"
  | "rejected"

export type OrderCategory = "music" | "promotion" | "design" | "ai" | "protect" | "other"

export interface OrderView {
  id: string
  serviceName: string
  category: OrderCategory
  createdAt: string
  amount: number
  status: OrderDisplayStatus
  description?: string
  isMock?: boolean
}

export type TransactionType =
  | "topup"
  | "service_payment"
  | "royalty_credit"
  | "withdrawal"
  | "referral_bonus"
  | "refund"

export interface TransactionView {
  id: string
  date: string
  type: TransactionType
  amount: number
  status: "completed" | "pending" | "failed"
  description: string
}

export interface ReferralView {
  id: string
  userName: string
  registeredAt: string
  ordersTotal: number
  bonus: number
  status: "active" | "pending" | "inactive"
}

export type TicketStatus = "open" | "pending" | "answered" | "closed"

export interface TicketView {
  id: string
  subject: string
  category: string
  createdAt: string
  updatedAt: string
  status: TicketStatus
  messages?: TicketMessageView[]
}

export interface TicketMessageView {
  id: string
  author: "user" | "support"
  text: string
  createdAt: string
}

export interface DashboardStats {
  balance: number
  activeOrders: number
  releasesInProgress: number
  availableRoyalties: number
}

export interface ReleaseView {
  id: string
  coverUrl?: string
  title: string
  artist: string
  status: string
  releaseDate?: string
  platforms?: string[]
  kind: "track" | "album" | "draft"
  wizardStep?: number
  releaseStatus?: string
}

export interface CabinetUserView {
  email: string
  displayName?: string
  streamingBalance: number
  subscriptionName?: string
  subscriptionExpiresAt?: string
}
