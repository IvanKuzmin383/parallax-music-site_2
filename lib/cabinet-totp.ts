import crypto from "crypto"

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

export function generateTotpSecret(bytes = 20): string {
  const buf = crypto.randomBytes(bytes)
  return base32Encode(buf)
}

export function buildOtpAuthUrl(params: {
  email: string
  secret: string
  issuer?: string
}): string {
  const issuer = params.issuer ?? "Parallax Music"
  const label = encodeURIComponent(`${issuer}:${params.email}`)
  const query = new URLSearchParams({
    secret: params.secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  })
  return `otpauth://totp/${label}?${query.toString()}`
}

export function verifyTotpCode(
  secretBase32: string,
  code: string,
  window = 1
): boolean {
  const normalized = code.replace(/\s+/g, "").trim()
  if (!/^\d{6}$/.test(normalized)) return false
  let secret: Buffer
  try {
    secret = base32Decode(secretBase32)
  } catch {
    return false
  }
  const now = Math.floor(Date.now() / 1000 / 30)
  for (let w = -window; w <= window; w++) {
    const expected = hotp(secret, now + w)
    if (timingSafeEqual(expected, normalized)) return true
  }
  return false
}

function hotp(secret: Buffer, counter: number): string {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64BE(BigInt(counter))
  const hmac = crypto.createHmac("sha1", secret).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(code % 1_000_000).padStart(6, "0")
}

function timingSafeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ""
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }
  return output
}

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "")
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) throw new Error("Invalid base32")
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(out)
}
