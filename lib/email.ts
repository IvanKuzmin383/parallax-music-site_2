import { Resend } from "resend"

// RESEND_API_KEY - ключ из Resend Dashboard. RESEND_FROM_EMAIL - отправитель (например "Parallax Music <noreply@ваш-домен.ru>").
const resendApiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL || "Parallax Music <onboarding@resend.dev>"

export function isEmailConfigured(): boolean {
  return Boolean(resendApiKey)
}

/** Inbox(es) for contact/demo form alerts (comma-separated). */
export function getNotifyEmails(): string[] {
  const raw = process.env.RESEND_NOTIFY_EMAIL ?? ""
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export async function sendFixPackRegistrationEmail(
  to: string,
  registerLink: string,
  tracksCount: number
): Promise<{ ok: boolean; error?: string }> {
  if (!resendApiKey) {
    console.error("[email] RESEND_API_KEY is not set")
    return { ok: false, error: "Email not configured" }
  }

  const resend = new Resend(resendApiKey)
  const hrefAttr = registerLink.replace(/"/g, "&quot;")
  const linkText = escapeHtmlText(registerLink)

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: "Оплата пакета треков Fix - зарегистрируйтесь в кабинете",
      html: `
        <p>Здравствуйте!</p>
        <p>Оплата пакета треков (тариф Fix) прошла успешно.</p>
        <p><b>Количество треков:</b> ${tracksCount}</p>
        <p>Чтобы загружать релизы, зарегистрируйтесь в личном кабинете с тем же email, который вы указали при оплате.</p>
        <p>Перейдите по ссылке для регистрации:<br/>
        <a href="${hrefAttr}">${linkText}</a></p>
        <p>Если вы уже зарегистрированы, войдите в кабинет на сайте.</p>
        <p>- Parallax Music</p>
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
      subject: "Ваша подписка оплачена - зарегистрируйтесь в кабинете",
      html: `
        <p>Здравствуйте!</p>
        <p>Оплата подписки прошла успешно.</p>
        <p><b>Тариф:</b> ${safeName}</p>
        <p>Чтобы начать пользоваться кабинетом, пожалуйста, зарегистрируйтесь с тем же email, который вы указали при оплате.</p>
        <p>Перейдите по ссылке для регистрации:<br/>
        <a href="${hrefAttr}">${linkText}</a></p>
        <p>Если вы уже зарегистрированы, просто проигнорируйте это письмо и войдите в кабинет на сайте.</p>
        <p>- Parallax Music</p>
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
      subject: "Напоминание: предстоящее списание по подписке - Parallax Music",
      html: `
        <p>Здравствуйте!</p>
        <p>Напоминаем о предстоящем автоматическом списании по подписке.</p>
        <p><b>Тариф:</b> ${safePlan}</p>
        <p><b>Сумма:</b> ${safeAmount} ₽</p>
        <p><b>Плановое списание:</b> ${safeWhen} (время по Москве, если применимо)</p>
        <p>Отключить автопродление можно в личном кабинете:<br/>
        <a href="${hrefAttr}">${linkText}</a></p>
        <p>- Parallax Music</p>
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
      subject: "Подтвердите отключение автопродления - Parallax Music",
      html: `
        <p>Здравствуйте!</p>
        <p>Вы запросили отключение автоматического продления подписки. Перейдите по ссылке для подтверждения (ссылка действительна 24 часа):</p>
        <p><a href="${hrefAttr}">${linkText}</a></p>
        <p>Если вы не отправляли этот запрос, проигнорируйте письмо.</p>
        <p>- Parallax Music</p>
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

export async function sendStaffNotificationEmail(params: {
  to: string[]
  subject: string
  html: string
}): Promise<{ ok: boolean; error?: string }> {
  if (!resendApiKey) {
    console.error("[email] RESEND_API_KEY is not set")
    return { ok: false, error: "Email not configured" }
  }

  if (params.to.length === 0) {
    return { ok: false, error: "No recipients" }
  }

  const resend = new Resend(resendApiKey)

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      html: params.html,
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

/** Письмо с кодом подтверждения email при регистрации (HTML). */
export async function sendRegistrationVerificationEmail(params: {
  to: string
  code: string
  ttlMinutes: number
}): Promise<{ ok: boolean; error?: string }> {
  if (!resendApiKey) {
    console.error("[email] RESEND_API_KEY is not set")
    return { ok: false, error: "Email not configured" }
  }

  const resend = new Resend(resendApiKey)
  const codeDigits = params.code.replace(/\s+/g, "").split("").join(" ")
  const codeEscaped = escapeHtmlText(codeDigits)
  const ttl = Math.max(1, Math.floor(params.ttlMinutes))

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Код подтверждения</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#e11d48,#f97316);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px 28px;">
              <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#18181b;">
                PARALLAX <span style="color:#e11d48;">MUSIC</span>
              </div>
              <div style="margin-top:4px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#a1a1aa;">
                Личный кабинет
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 8px 28px;">
              <div style="font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:#e11d48;">
                Код подтверждения
              </div>
              <h1 style="margin:8px 0 0 0;font-size:24px;line-height:1.25;font-weight:700;color:#18181b;">
                Подтвердите почту
              </h1>
              <p style="margin:12px 0 0 0;font-size:15px;line-height:1.5;color:#52525b;">
                Введите этот код, чтобы завершить регистрацию в Parallax Music.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;">
                <tr>
                  <td align="center" style="padding:22px 16px;">
                    <div style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#a1a1aa;">
                      Код подтверждения
                    </div>
                    <div style="margin-top:10px;font-size:32px;font-weight:700;letter-spacing:0.28em;color:#e11d48;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;">
                      ${codeEscaped}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e4e4e7;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;font-size:13px;line-height:1.45;color:#52525b;">
                    <strong style="color:#18181b;">Срок действия:</strong> ${ttl} минут.
                    Никому не сообщайте код. Сотрудники сервиса никогда не запрашивают его в чате или по телефону.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px 28px;border-top:1px solid #f4f4f5;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;">
                Если вы не запрашивали этот код, просто проигнорируйте письмо.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [params.to],
      subject: `Код подтверждения ${params.code} - Parallax Music`,
      html,
      text: [
        "Parallax Music - подтверждение почты",
        "",
        `Ваш код: ${params.code}`,
        `Код действует ${ttl} минут.`,
        "",
        "Никому не сообщайте код.",
        "Если вы не запрашивали регистрацию, проигнорируйте письмо.",
      ].join("\n"),
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
      subject: "Восстановление пароля - Parallax Music",
      html: `
        <p>Здравствуйте.</p>
        <p>Вы запросили восстановление пароля в личном кабинете Parallax Music.</p>
        <p>Перейдите по ссылке, чтобы задать новый пароль (ссылка действительна 1 час):</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
        <p>- Parallax Music</p>
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
