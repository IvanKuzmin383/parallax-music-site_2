import { isTurnstileEnabledServer } from "@/lib/turnstile-config"

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

type TurnstileSuccessResponse = {
  success: true
  challenge_ts?: string
  hostname?: string
}

type TurnstileErrorResponse = {
  success: false
  "error-codes"?: string[]
}

type TurnstileVerifyResponse = TurnstileSuccessResponse | TurnstileErrorResponse

export async function verifyTurnstileToken(
  token: string | undefined,
  ip: string | null
): Promise<boolean> {
  if (!isTurnstileEnabledServer()) {
    return true
  }

  const secret = process.env.TURNSTILE_SECRET_KEY

  if (!secret || !token) {
    return false
  }

  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret,
      response: token,
      remoteip: ip ?? "",
    }),
  })

  if (!res.ok) {
    return false
  }

  let data: TurnstileVerifyResponse
  try {
    data = (await res.json()) as TurnstileVerifyResponse
  } catch {
    return false
  }

  return data.success === true
}

