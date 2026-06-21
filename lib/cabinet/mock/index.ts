import type { OrderView, TransactionView, ReferralView, TicketView } from "../types"

export const MOCK_ORDERS: OrderView[] = [
  {
    id: "demo-001",
    serviceName: "VK Реклама",
    category: "promotion",
    createdAt: "2026-06-10T12:00:00.000Z",
    amount: 5000,
    status: "in_progress",
    description: "Продвижение сингла «Demo Track»",
    isMock: true,
  },
  {
    id: "demo-002",
    serviceName: "AI Обложки",
    category: "design",
    createdAt: "2026-06-05T09:30:00.000Z",
    amount: 500,
    status: "completed",
    description: "Обложка для EP",
    isMock: true,
  },
]

export const MOCK_TRANSACTIONS: TransactionView[] = [
  {
    id: "tx-1",
    date: "2026-06-01T10:00:00.000Z",
    type: "royalty_credit",
    amount: 1250,
    status: "completed",
    description: "Начисление роялти за май 2026",
  },
  {
    id: "tx-2",
    date: "2026-05-28T14:20:00.000Z",
    type: "service_payment",
    amount: -500,
    status: "completed",
    description: "Оплата услуги «AI Обложки»",
  },
  {
    id: "tx-3",
    date: "2026-05-15T11:00:00.000Z",
    type: "withdrawal",
    amount: -3000,
    status: "completed",
    description: "Вывод роялти на карту",
  },
  {
    id: "tx-4",
    date: "2026-06-12T08:00:00.000Z",
    type: "topup",
    amount: 1000,
    status: "pending",
    description: "Пополнение баланса (демо)",
  },
]

export const MOCK_REFERRALS: ReferralView[] = [
  {
    id: "ref-1",
    userName: "artist_demo@mail.ru",
    registeredAt: "2026-04-12T00:00:00.000Z",
    ordersTotal: 8500,
    bonus: 425,
    status: "active",
  },
  {
    id: "ref-2",
    userName: "newbeat@yandex.ru",
    registeredAt: "2026-05-20T00:00:00.000Z",
    ordersTotal: 0,
    bonus: 0,
    status: "pending",
  },
]

export const MOCK_REFERRAL_STATS = {
  invitedCount: 2,
  ordersTotal: 8500,
  bonusEarned: 425,
  availableBonus: 425,
  referralLink: "https://parallaxmusic.ru/?ref=DEMO123",
}

export const MOCK_TICKETS: TicketView[] = [
  {
    id: "ticket-1",
    subject: "Вопрос по модерации релиза",
    category: "Дистрибуция",
    createdAt: "2026-06-08T15:00:00.000Z",
    updatedAt: "2026-06-09T10:30:00.000Z",
    status: "answered",
    messages: [
      {
        id: "m1",
        author: "user",
        text: "Здравствуйте! Когда будет результат модерации?",
        createdAt: "2026-06-08T15:00:00.000Z",
      },
      {
        id: "m2",
        author: "support",
        text: "Добрый день! Релиз на проверке, ожидайте 1–3 рабочих дня.",
        createdAt: "2026-06-09T10:30:00.000Z",
      },
    ],
  },
  {
    id: "ticket-2",
    subject: "Уточнение по оплате",
    category: "Оплата",
    createdAt: "2026-06-11T09:00:00.000Z",
    updatedAt: "2026-06-11T09:00:00.000Z",
    status: "open",
  },
]

export const TICKET_CATEGORIES = [
  "Дистрибуция",
  "Оплата",
  "Продвижение",
  "Оформление",
  "Депонирование",
  "Техническая проблема",
  "Другое",
] as const

export const TRANSACTION_TYPE_LABELS: Record<TransactionView["type"], string> = {
  topup: "Пополнение",
  service_payment: "Оплата услуги",
  royalty_credit: "Начисление роялти",
  withdrawal: "Вывод средств",
  referral_bonus: "Реферальное начисление",
  refund: "Возврат",
}
