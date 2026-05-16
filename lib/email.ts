import { Resend } from "resend"

// RESEND_API_KEY — ключ из Resend Dashboard. RESEND_FROM_EMAIL — отправитель (например "Parallax Music <noreply@ваш-домен.ru>").
const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL || "Parallax Music <onboarding@resend.dev>"

export function isEmailConfigured(): boolean {
  return Boolean(resendApiKey)
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function sendSubscriptionRegistrationEmail(
  to: string,
  registerLink: string,
  subscriptionName: string
): Promise<{ ok: boolean; error?: string }> {
  if (!resendApiKey) {
    console.error("[email] RESEND_API_KEY is not set")
    return { ok: false, error: "Email not configured" }
  }

  const resend = new Resend(resendApiKey)
  const safeName = escapeHtmlText(subscriptionName)
  const hrefAttr = registerLink.replace(/"/g, "&quot;")
  const linkText = escapeHtmlText(registerLink)

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: "Ваша подписка оплачена — зарегистрируйтесь в кабинете",
      html: `
        <p>Здравствуйте!</p>
        <p>Оплата подписки прошла успешно.</p>
        <p><b>Тариф:</b> ${safeName}</p>
        <p>Чтобы начать пользоваться кабинетом, пожалуйста, зарегистрируйтесь с тем же email, который вы указали при оплате.</p>
        <p>Перейдите по ссылке для регистрации:<br/>
        <a href="${hrefAttr}">${linkText}</a></p>
        <p>Если вы уже зарегистрированы, просто проигнорируйте это письмо и войдите в кабинет на сайте.</p>
        <p>— Parallax Music</p>
      `,
    })

    if (error) {
      console.error("[email] Resend error:", error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[email] Send failed:", err)
    return { ok: false, error: err instanceof Error ? err.message : "Send failed" }
  }
}

export async function sendAutopayReminderEmail(params: {
  to: string
  amountRub: string
  chargeDateLabel: string
  planName: string
  profileUrl: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!resendApiKey) {
    console.error("[email] RESEND_API_KEY is not set")
    return { ok: false, error: "Email not configured" }
  }

  const resend = new Resend(resendApiKey)
  const safePlan = escapeHtmlText(params.planName)
  const safeAmount = escapeHtmlText(params.amountRub)
  const safeWhen = escapeHtmlText(params.chargeDateLabel)
  const hrefAttr = params.profileUrl.replace(/"/g, "&quot;")
  const linkText = escapeHtmlText(params.profileUrl)

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [params.to],
      subject: "Напоминание: предстоящее списание по подписке — Parallax Music",
      html: `
        <p>Здравствуйте!</p>
        <p>Напоминаем о предстоящем автоматическом списании по подписке.</p>
        <p><b>Тариф:</b> ${safePlan}</p>
        <p><b>Сумма:</b> ${safeAmount} ₽</p>
        <p><b>Плановое списание:</b> ${safeWhen} (время по Москве, если применимо)</p>
        <p>Отключить автопродление можно в личном кабинете:<br/>
        <a href="${hrefAttr}">${linkText}</a></p>
        <p>— Parallax Music</p>
      `,
    })

    if (error) {
      console.error("[email] Resend error:", error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[email] Send failed:", err)
    return { ok: false, error: err instanceof Error ? err.message : "Send failed" }
  }
}

export async function sendAutopayDisableConfirmEmail(params: {
  to: string
  confirmUrl: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!resendApiKey) {
    console.error("[email] RESEND_API_KEY is not set")
    return { ok: false, error: "Email not configured" }
  }

  const resend = new Resend(resendApiKey)
  const hrefAttr = params.confirmUrl.replace(/"/g, "&quot;")
  const linkText = escapeHtmlText(params.confirmUrl)

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [params.to],
      subject: "Подтвердите отключение автопродления — Parallax Music",
      html: `
        <p>Здравствуйте!</p>
        <p>Вы запросили отключение автоматического продления подписки. Перейдите по ссылке для подтверждения (ссылка действительна 24 часа):</p>
        <p><a href="${hrefAttr}">${linkText}</a></p>
        <p>Если вы не отправляли этот запрос, проигнорируйте письмо.</p>
        <p>— Parallax Music</p>
      `,
    })

    if (error) {
      console.error("[email] Resend error:", error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[email] Send failed:", err)
    return { ok: false, error: err instanceof Error ? err.message : "Send failed" }
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<{ ok: boolean; error?: string }> {
  if (!resendApiKey) {
    console.error("[email] RESEND_API_KEY is not set")
    return { ok: false, error: "Email not configured" }
  }

  const resend = new Resend(resendApiKey)

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: "Восстановление пароля — Parallax Music",
      html: `
        <p>Здравствуйте.</p>
        <p>Вы запросили восстановление пароля в личном кабинете Parallax Music.</p>
        <p>Перейдите по ссылке, чтобы задать новый пароль (ссылка действительна 1 час):</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
        <p>— Parallax Music</p>
      `,
    })

    if (error) {
      console.error("[email] Resend error:", error)
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (err) {
    console.error("[email] Send failed:", err)
    return { ok: false, error: err instanceof Error ? err.message : "Send failed" }
  }
}
