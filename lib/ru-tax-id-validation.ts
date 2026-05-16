/** Проверка контрольных цифр ИНН / ОГРН / ОГРНИП / КПП (РФ). */

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "")
}

function inn10Checksum(inn: string): boolean {
  const coeffs = [2, 4, 10, 3, 5, 9, 4, 6, 8]
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(inn[i]) * coeffs[i]
  return (sum % 11) % 10 === Number(inn[9])
}

function inn12Checksum(inn: string): boolean {
  const coeffs11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
  const coeffs12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
  let sum11 = 0
  for (let i = 0; i < 10; i++) sum11 += Number(inn[i]) * coeffs11[i]
  const c11 = (sum11 % 11) % 10
  if (c11 !== Number(inn[10])) return false
  let sum12 = 0
  for (let i = 0; i < 11; i++) sum12 += Number(inn[i]) * coeffs12[i]
  return (sum12 % 11) % 10 === Number(inn[11])
}

export function validateInn10(value: string): boolean {
  const inn = digitsOnly(value)
  if (!/^\d{10}$/.test(inn)) return false
  return inn10Checksum(inn)
}

export function validateInn12(value: string): boolean {
  const inn = digitsOnly(value)
  if (!/^\d{12}$/.test(inn)) return false
  return inn12Checksum(inn)
}

export function validateKpp(value: string): boolean {
  const kpp = digitsOnly(value)
  return /^\d{9}$/.test(kpp)
}

export function validateOgrn(value: string): boolean {
  const ogrn = digitsOnly(value)
  if (!/^\d{13}$/.test(ogrn)) return false
  const mod = (Number(ogrn.slice(0, 12)) % 11) % 10
  return mod === Number(ogrn[12])
}

export function validateOgrnip(value: string): boolean {
  const ogrnip = digitsOnly(value)
  if (!/^\d{15}$/.test(ogrnip)) return false
  const mod = (Number(ogrnip.slice(0, 14)) % 13) % 10
  return mod === Number(ogrnip[14])
}

export function validateBik(value: string): boolean {
  return /^\d{9}$/.test(digitsOnly(value))
}

export function validateBankAccount(value: string): boolean {
  return /^\d{20}$/.test(digitsOnly(value))
}

export function normalizeDigits(value: string): string {
  return digitsOnly(value)
}
