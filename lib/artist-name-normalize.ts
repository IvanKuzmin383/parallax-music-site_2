/** Сравнение имён исполнителя (без серверных зависимостей - безопасно для client components). */
export function normalizeArtistForPolicy(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}
