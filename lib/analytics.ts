/**
 * Базовая аналитика конверсий (Яндекс Метрика, цели reachGoal).
 *
 * Правила:
 * - передаём только короткие технические метки из белого списка (место клика, id тарифа, инструмент);
 * - никаких email, имён, id пользователей и заказов, сумм платежей, текстов из форм;
 * - если счётчик не подключён (нет NEXT_PUBLIC_YANDEX_METRIKA_ID), вызовы ничего не делают.
 */

export type AnalyticsGoal =
  /** Клик по CTA регистрации на публичных страницах (params.location) */
  | "cta_register_click"
  /** Клик по выбору тарифа на публичной странице (params.plan, params.period) */
  | "cta_pricing_click"
  /** Клик по CTA "Посмотреть возможности" и переходам к инструментам (params.location) */
  | "cta_features_click"
  /** Успешная регистрация кабинета */
  | "register_success"
  /** Использовано бесплатное скачивание в инструменте (params.tool) */
  | "tool_free_used"
  /** Платное скачивание или оплата кредита в инструменте (params.tool) */
  | "tool_paid_used"
  /** Покупка подтверждена сервером (params.order_type, params.method) */
  | "purchase_success"
  /** Выбор тарифа внутри кабинета (params.plan) */
  | "plan_checkout_start"

type GoalParamKey = "location" | "plan" | "period" | "tool" | "order_type" | "method" | "variant"

export type AnalyticsParams = Partial<Record<GoalParamKey, string>>

const ALLOWED_KEYS: ReadonlySet<string> = new Set<GoalParamKey>([
  "location",
  "plan",
  "period",
  "tool",
  "order_type",
  "method",
  "variant",
])

const SAFE_VALUE = /^[a-z0-9_.:\-]{1,40}$/i

type YmFn = (id: number, action: string, goal?: string, params?: Record<string, string>) => void

function getCounterId(): number | null {
  const raw = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID
  if (!raw || !/^\d+$/.test(raw.trim())) return null
  return Number(raw.trim())
}

function sanitize(params?: AnalyticsParams): Record<string, string> | undefined {
  if (!params) return undefined
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (!ALLOWED_KEYS.has(key)) continue
    if (typeof value !== "string" || !SAFE_VALUE.test(value)) continue
    out[key] = value
  }
  return Object.keys(out).length > 0 ? out : undefined
}

export function trackGoal(goal: AnalyticsGoal, params?: AnalyticsParams): void {
  if (typeof window === "undefined") return
  const id = getCounterId()
  if (id === null) return
  const ym = (window as unknown as { ym?: YmFn }).ym
  if (typeof ym !== "function") return
  try {
    ym(id, "reachGoal", goal, sanitize(params))
  } catch {
    // аналитика не должна ломать интерфейс
  }
}

/** Отправить цель один раз за вкладку (для событий вроде успешной покупки). */
export function trackGoalOnce(key: string, goal: AnalyticsGoal, params?: AnalyticsParams): void {
  if (typeof window === "undefined") return
  const storageKey = `prllx-goal:${goal}:${key}`
  try {
    if (window.sessionStorage.getItem(storageKey)) return
    window.sessionStorage.setItem(storageKey, "1")
  } catch {
    // sessionStorage недоступен - отправим без дедупликации
  }
  trackGoal(goal, params)
}
