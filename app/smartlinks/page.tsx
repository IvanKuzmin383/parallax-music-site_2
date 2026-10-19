import Link from "next/link"
import type { Metadata } from "next"
import { TOOLS_SMARTLINK_PRICE_RUB } from "@/lib/tools-smartlink-pricing"

export const metadata: Metadata = {
  title: "Смартлинки - одна ссылка на все площадки | Parallax Music",
  description:
    "Создайте красивую страницу со ссылками на Spotify, Apple Music, VK и другие сервисы. Для артистов с дистрибуцией и без - регистрация в кабинете.",
}

export default function SmartlinksMarketingPage() {
  const price = TOOLS_SMARTLINK_PRICE_RUB.toLocaleString("ru-RU")

  return (
    <main className="min-h-svh bg-[#0B0B0C] text-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-red-400/90">
          Parallax Music
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Смартлинк - одна ссылка на все площадки
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-white/70">
          Страница с обложкой, отрывком трека и кнопками Spotify, Apple Music, VK Музыка, YouTube и
          другими. Подходит для релиза, пресейва и промо - даже если вы не дистрибутируетесь у нас.
        </p>

        <ul className="mt-10 space-y-3 text-white/80">
          <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            Темы оформления (в том числе "винил"), свои цвета и соцсети
          </li>
          <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            Обложка и короткий превью-аудио для прослушивания на странице
          </li>
          <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            Для артистов лейбла - промо-смартлинк до официального релиза
          </li>
          <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            Для всех остальных - создание в кабинете от {price} ₽ / год
          </li>
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/cabinet"
            className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500"
          >
            Войти или зарегистрироваться
          </Link>
          <Link
            href="/cabinet/tools/smartlinks"
            className="inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white/90 hover:bg-white/5"
          >
            Открыть инструмент
          </Link>
        </div>

        <p className="mt-8 text-sm text-white/45">
          После входа в кабинет: Инструменты → Смартлинки. Импорт из релиза - одной кнопкой в
          редакторе.
        </p>
      </div>
    </main>
  )
}
