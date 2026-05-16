import { redirect } from "next/navigation"

// Раньше была отдельная страница "Yandex Music".
// Сейчас используется единый раздел `music-stats`, где платформа выбирается переключателем.
export default function YandexMusicStatsPage() {
  redirect("/admin26081993/music-stats")
}

