/**
 * ШАБЛОН страницы кейса (маршрут не публикуется - папка _template).
 *
 * Новый кейс:
 * 1. Скопируйте эту папку → app/cases/{slug}/page.tsx
 * 2. Добавьте запись в data/cases.ts (title, excerpt, metaDescription, keywords)
 * 3. Картинки → public/cases/{slug}/
 * 4. Вёрстку ниже замените контентом из Canvas
 */
import type { Metadata } from "next"
import { getCaseStudyBySlug } from "@/data/cases"
import { buildCaseStudyMetadata } from "@/lib/case-seo"
import { CaseStudyLayout } from "@/components/case-study-layout"
import { CaseStudyJsonLd } from "@/components/case-study-json-ld"
import {
  CaseSection,
  CaseFigure,
  CaseQuote,
  CaseTable,
} from "@/components/case-study-blocks"

const SLUG = "artist-slug"
const caseMeta = getCaseStudyBySlug(SLUG)

export const metadata: Metadata = caseMeta
  ? buildCaseStudyMetadata(SLUG, caseMeta)
  : { title: "Кейс" }

export default function CaseTemplatePage() {
  if (!caseMeta) {
    return null
  }

  return (
    <>
      <CaseStudyJsonLd slug={SLUG} meta={caseMeta} />
      <CaseStudyLayout
        meta={caseMeta}
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

        <CaseQuote text="Цитата артиста о работе с нами" author={caseMeta.artistName} />
      </CaseStudyLayout>
    </>
  )
}
