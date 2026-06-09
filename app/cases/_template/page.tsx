/**
 * ШАБЛОН страницы кейса (маршрут не публикуется — папка _template).
 *
 * Новый кейс:
 * 1. Скопируйте эту папку → app/cases/{slug}/page.tsx
 * 2. Добавьте запись в data/cases.ts
 * 3. Картинки → public/cases/{slug}/
 * 4. Вёрстку ниже замените контентом из Canvas
 */
import type { Metadata } from "next"
import { CaseStudyLayout } from "@/components/case-study-layout"
import {
  CaseSection,
  CaseFigure,
  CaseQuote,
  CaseTable,
} from "@/components/case-study-blocks"

const SLUG = "artist-slug"

const meta = {
  title: "Заголовок кейса",
  excerpt: "Краткое описание для hero-блока",
  coverImage: `/cases/${SLUG}/cover.webp`,
  artistName: "Имя артиста",
  genre: "Жанр",
  services: ["Дистрибуция", "Питчинг"],
}

export const metadata: Metadata = {
  title: meta.title,
  description: meta.excerpt,
  openGraph: {
    title: meta.title,
    description: meta.excerpt,
    images: meta.coverImage ? [{ url: meta.coverImage }] : undefined,
  },
}

export default function CaseTemplatePage() {
  return (
    <CaseStudyLayout
      meta={meta}
      metrics={[
        { label: "Прослушивания", value: "+340%", hint: "за 6 месяцев" },
        { label: "Плейлисты", value: "12" },
        { label: "Период", value: "6 мес." },
      ]}
    >
      <CaseSection title="Задача">
        <p>Опишите исходную ситуацию артиста до работы с Parallax Music.</p>
      </CaseSection>

      <CaseSection title="Что сделали">
        <ul className="list-disc pl-6 space-y-2">
          <li>Дистрибуция на 50+ площадок</li>
          <li>Питчинг editorial-плейлистов</li>
        </ul>
      </CaseSection>

      <CaseSection title="Результаты">
        <CaseTable
          headers={["Метрика", "Было", "Стало"]}
          rows={[
            ["Прослушивания/мес", "800", "45 000"],
            ["Editorial плейлисты", "0", "3"],
          ]}
        />
        <CaseFigure
          src={`/cases/${SLUG}/chart-spotify.webp`}
          alt="Динамика прослушиваний"
          caption="Spotify, период кампании"
        />
      </CaseSection>

      <CaseQuote text="Цитата артиста о работе с нами" author={meta.artistName} />
    </CaseStudyLayout>
  )
}
