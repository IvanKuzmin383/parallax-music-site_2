function isEnvFlagDisabled(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "0" || normalized === "false" || normalized === "off" || normalized === "no"
}

export function isTurnstileEnabledServer(): boolean {
  const flag = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED
  return !isEnvFlagDisabled(flag)
}

export function isTurnstileEnabledClient(): boolean {
  return !isEnvFlagDisabled(process.env.NEXT_PUBLIC_TURNSTILE_ENABLED)
}

export function getTurnstileSiteKeyClient(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""
}
