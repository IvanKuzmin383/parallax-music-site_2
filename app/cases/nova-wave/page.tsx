import type { Metadata } from "next"
import { getCaseStudyBySlug } from "@/data/cases"
import { buildCaseStudyMetadata } from "@/lib/case-seo"
import { CaseStudyLayout } from "@/components/case-study-layout"
import { CaseStudyJsonLd } from "@/components/case-study-json-ld"
import {
  CaseSection,
  CaseQuote,
  CaseTable,
  CaseBarChartPreview,
  CaseFigure,
} from "@/components/case-study-blocks"

const SLUG = "nova-wave"
const caseMeta = getCaseStudyBySlug(SLUG)!

export const metadata: Metadata = buildCaseStudyMetadata(SLUG, caseMeta)

export default function NovaWaveCasePage() {
  return (
    <>
      <CaseStudyJsonLd slug={SLUG} meta={caseMeta} />
      <CaseStudyLayout
      meta={caseMeta}
      metrics={[
        { label: "Рост прослушиваний", value: "+340%", hint: "за 6 месяцев" },
        { label: "Editorial плейлисты", value: "3" },
        { label: "Период работы", value: "6 мес." },
      ]}
    >
      <CaseSection title="Задача">
        <p>
          Nova Wave выпустила сингл «City Lights» самостоятельно: трек появился на площадках, но
          органический охват застрял на уровне нескольких сотен прослушиваний в месяц. Editorial
          плейлисты не приходили, а продвижение в соцсетях не давало стабильного роста.
        </p>
        <p>
          Артисту нужен был партнёр, который выстроит релизную стратегию, подаст трек кураторам и
          поможет выйти на аудиторию вне узкого круга подписчиков.
        </p>
      </CaseSection>

      <CaseSection title="Что сделали">
        <ul className="list-disc pl-6 space-y-2">
          <li>Дистрибуция на 50+ стриминговых площадок с корректными метаданными и ISRC</li>
          <li>Питчинг editorial-плейлистов Spotify и Яндекс Музыки</li>
          <li>Подготовка Spotify Canvas и вертикального видео для соцсетей</li>
          <li>Консультация по релизному окну и последовательности синглов</li>
        </ul>
      </CaseSection>

      <CaseSection title="Результаты">
        <CaseTable
          headers={["Метрика", "До", "После (6 мес.)"]}
          rows={[
            ["Прослушивания / мес.", "800", "45 000"],
            ["Editorial плейлисты", "0", "3"],
            ["Подписчики Spotify", "120", "2 400"],
            ["Яндекс Музыка — прослушивания", "350 / мес.", "18 000 / мес."],
          ]}
          caption="Данные за период кампании. Цифры предоставлены артистом."
        />

        <CaseBarChartPreview
          title="Динамика прослушиваний (Spotify)"
          caption="Spotify for Artists, январь — июнь 2025"
          data={[
            { label: "Янв", value: 800 },
            { label: "Фев", value: 4200 },
            { label: "Мар", value: 9800 },
            { label: "Апр", value: 18500 },
            { label: "Май", value: 31000 },
            { label: "Июн", value: 45000 },
          ]}
        />

        <CaseFigure
          src="/hero-studio.webp"
          alt="Студийная сессия"
          caption="Работа над релизом Nova Wave"
        />
      </CaseSection>

      <CaseSection title="Плейлисты">
        <p>Трек попал в editorial-плейлисты Spotify и подборки Яндекс Музыки — это дало основной
          прирост прослушиваний в первые 8 недель после питчинга.</p>
        <CaseTable
          headers={["Площадка", "Плейлист", "Период"]}
          rows={[
            ["Spotify", "Fresh Finds Russia", "12 недель"],
            ["Spotify", "Indie Pop", "8 недель"],
            ["Яндекс Музыка", "Новый indie", "6 недель"],
          ]}
        />
      </CaseSection>

      <CaseQuote
        text="Parallax помогли не просто выложить трек, а выстроить стратегию. Через пару месяцев цифры стали совсем другими — и это не случайность."
        author="Nova Wave"
      />
    </CaseStudyLayout>
    </>
  )
}
