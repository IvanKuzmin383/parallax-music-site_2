/** Конфиг целей кампании VK Ads - единый источник для карточек, формы и превью. */

export const VK_ADS_PRICE_FROM_RUB = 5000

export const VK_ADS_PRICE_LABEL = `от ${VK_ADS_PRICE_FROM_RUB.toLocaleString("ru-RU")} ₽`

export type VkAdsGoalId = "listeners" | "followers" | "visits"

export type VkAdsGoalConfig = {
  id: VkAdsGoalId
  title: string
  cardCaption: string
  explanation: string
  postText: string
  imageLabel: string
  destination: string
  ctaLabel: string
  linkFieldLabel: string
}

export const VK_ADS_GOALS: readonly VkAdsGoalConfig[] = [
  {
    id: "listeners",
    title: "Новые слушатели",
    cardCaption: "Знакомить людей с вашим треком",
    explanation:
      "Подбираем подачу для знакомства с треком и направляем заинтересованную аудиторию к прослушиванию.",
    postText: "Ищете новое звучание? Начните с этого трека.",
    imageLabel: "НОВЫЙ РЕЛИЗ",
    destination: "VK Музыка",
    ctaLabel: "Слушать трек",
    linkFieldLabel: "Ссылка на трек",
  },
  {
    id: "followers",
    title: "Подписчики сообщества",
    cardCaption: "Развивать аудиторию артиста",
    explanation:
      "Рассказываем об артисте и направляем аудиторию в сообщество, где можно следить за новыми релизами.",
    postText: "Музыка, которая звучит по-своему. Знакомьтесь с артистом и его новыми релизами.",
    imageLabel: "ВАШ АРТИСТ",
    destination: "Сообщество артиста",
    ctaLabel: "Открыть сообщество",
    linkFieldLabel: "Ссылка на сообщество",
  },
  {
    id: "visits",
    title: "Переходы на релиз",
    cardCaption: "Направлять людей к вашей музыке",
    explanation:
      "Готовим рекламную подачу и направляем людей на страницу релиза или проекта.",
    postText: "Новый релиз уже здесь. Откройте музыку, которую ещё не слышали.",
    imageLabel: "СЛУШАЙТЕ НОВОЕ",
    destination: "Страница релиза",
    ctaLabel: "Открыть релиз",
    linkFieldLabel: "Ссылка на релиз / проект",
  },
] as const

export const VK_ADS_DEFAULT_GOAL: VkAdsGoalId = "listeners"

export function getVkAdsGoal(id: string): VkAdsGoalConfig {
  return VK_ADS_GOALS.find((g) => g.id === id) ?? VK_ADS_GOALS[0]
}

export function isVkAdsGoalId(value: string): value is VkAdsGoalId {
  return VK_ADS_GOALS.some((g) => g.id === value)
}
