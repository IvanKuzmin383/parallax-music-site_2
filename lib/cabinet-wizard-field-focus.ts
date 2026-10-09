/** Стабильный id для `data-wizard-field` на полях визарда загрузки. */
export function wizardFieldId(key: string): string {
  return key
}

export function wizardTrackFieldId(trackId: string, field: string): string {
  return `track:${trackId}:${field}`
}

const HIGHLIGHT_CLASS = "wizard-field-highlight"
const HIGHLIGHT_MS = 2400

/**
 * Прокрутка к полю визарда + краткая подсветка.
 * Возвращает false, если элемент ещё не в DOM (нужен повтор после смены шага / аккордеона).
 */
export function revealWizardField(fieldId: string): boolean {
  if (typeof document === "undefined" || !fieldId) return false

  let el: HTMLElement | null = null
  try {
    el = document.querySelector(
      `[data-wizard-field="${CSS.escape(fieldId)}"]`,
    ) as HTMLElement | null
  } catch {
    el = document.querySelector(`[data-wizard-field="${fieldId}"]`) as HTMLElement | null
  }
  if (!el) return false

  el.scrollIntoView({ behavior: "smooth", block: "center" })
  el.classList.remove(HIGHLIGHT_CLASS)
  void el.offsetWidth
  el.classList.add(HIGHLIGHT_CLASS)

  const prevTimer = Number(el.dataset.wizardHighlightTimer || 0)
  if (prevTimer) window.clearTimeout(prevTimer)
  const timer = window.setTimeout(() => {
    el?.classList.remove(HIGHLIGHT_CLASS)
    if (el) delete el.dataset.wizardHighlightTimer
  }, HIGHLIGHT_MS)
  el.dataset.wizardHighlightTimer = String(timer)

  const focusable = el.querySelector<HTMLElement>(
    [
      'input:not([type="hidden"]):not([disabled])',
      "textarea:not([disabled])",
      'button[role="checkbox"]:not([disabled])',
      '[role="checkbox"]:not([disabled])',
      '[data-slot="checkbox"]:not([disabled])',
    ].join(","),
  )
  if (focusable) {
    try {
      focusable.focus({ preventScroll: true })
    } catch {
      // ignore
    }
  }

  return true
}

/** Несколько попыток - после смены шага / раскрытия аккордеона. */
export function revealWizardFieldWhenReady(
  fieldId: string,
  options?: { attempts?: number; intervalMs?: number },
): void {
  const attempts = options?.attempts ?? 12
  const intervalMs = options?.intervalMs ?? 80
  let left = attempts

  const tick = () => {
    if (revealWizardField(fieldId)) return
    left -= 1
    if (left <= 0) return
    window.setTimeout(tick, intervalMs)
  }

  window.setTimeout(tick, 40)
}
