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
    cardCaption: "В VK Музыку - сразу к прослушиванию трека",
    explanation:
      "Ведём в VK Музыку: человек жмёт "Слушать трек" и открывает музыку. Подача строится вокруг знакомства со звучанием.",
    postText: "Ищете новое звучание? Начните с этого трека",
    imageLabel: "НОВЫЙ РЕЛИЗ",
    destination: "VK Музыка",
    ctaLabel: "Слушать трек",
    linkFieldLabel: "Ссылка на трек",
  },
  {
    id: "followers",
    title: "Подписчики сообщества",
    cardCaption: "В сообщество артиста",
    explanation:
      "Ведём в сообщество: человек может подписаться и следить за новыми релизами. Подача рассказывает об артисте и проекте.",
    postText: "Музыка, которая звучит по-своему. Знакомьтесь с артистом и его новыми релизами",
    imageLabel: "ВАШ АРТИСТ",
    destination: "Сообщество артиста",
    ctaLabel: "Открыть сообщество",
    linkFieldLabel: "Ссылка на сообщество",
  },
  {
    id: "visits",
    title: "Переходы на релиз",
    cardCaption: "На страницу релиза, BandLink или сайт проекта",
    explanation:
      "Ведём на страницу релиза или проекта: пресейв, BandLink, сайт - там уже выбирают площадку. Важно не прослушивание в VK, а переход на вашу страницу.",
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
