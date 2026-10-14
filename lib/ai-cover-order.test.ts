import test from "node:test"
import assert from "node:assert/strict"
import {
  AI_COVER_PRICE_RUB,
  validateAiCoverOrder,
} from "./ai-cover-order"
import { stringifyServiceDetails } from "./order-service-details"

const baseOk = {
  includeTextOnCover: false,
  comment: "На ваш вкус",
  contactType: "telegram",
  contactValue: "@artist",
} as const

test("validateAiCoverOrder: price is always 500 without track id", () => {
  const result = validateAiCoverOrder(baseOk)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.totalAmount, AI_COVER_PRICE_RUB.toFixed(2))
  assert.equal(result.includeTextOnCover, false)
  assert.equal(result.artistName, null)
  assert.equal(result.releaseTitle, null)
  assert.equal(result.serviceDetails.includeTextOnCover, false)
  assert.equal(result.serviceDetails.artistName, undefined)
  assert.equal(result.serviceDetails.trackTitle, undefined)
})

test("validateAiCoverOrder: includeTextOnCover true requires both fields", () => {
  const bothEmpty = validateAiCoverOrder({
    ...baseOk,
    includeTextOnCover: true,
    artistName: "",
    releaseTitle: "",
  })
  assert.equal(bothEmpty.ok, false)
  if (bothEmpty.ok) return
  assert.equal(bothEmpty.fieldErrors.artistName, "Укажите имя артиста")
  assert.equal(bothEmpty.fieldErrors.releaseTitle, "Укажите название релиза")

  const onlyArtist = validateAiCoverOrder({
    ...baseOk,
    includeTextOnCover: true,
    artistName: "Artist",
    releaseTitle: "   ",
  })
  assert.equal(onlyArtist.ok, false)
  if (onlyArtist.ok) return
  assert.equal(onlyArtist.fieldErrors.releaseTitle, "Укажите название релиза")
  assert.equal(onlyArtist.fieldErrors.artistName, undefined)

  const onlyTitle = validateAiCoverOrder({
    ...baseOk,
    includeTextOnCover: true,
    artistName: "  ",
    releaseTitle: "Release",
  })
  assert.equal(onlyTitle.ok, false)
  if (onlyTitle.ok) return
  assert.equal(onlyTitle.fieldErrors.artistName, "Укажите имя артиста")

  const bothOk = validateAiCoverOrder({
    ...baseOk,
    includeTextOnCover: true,
    artistName: "  Artist Name  ",
    releaseTitle: "  My Single  ",
  })
  assert.equal(bothOk.ok, true)
  if (!bothOk.ok) return
  assert.equal(bothOk.artistName, "Artist Name")
  assert.equal(bothOk.releaseTitle, "My Single")
  assert.equal(bothOk.totalAmount, "500.00")
  assert.equal(bothOk.serviceDetails.includeTextOnCover, true)
  assert.equal(bothOk.serviceDetails.artistName, "Artist Name")
  assert.equal(bothOk.serviceDetails.trackTitle, "My Single")
})

test("validateAiCoverOrder: draft text ignored when flag is off", () => {
  const result = validateAiCoverOrder({
    ...baseOk,
    includeTextOnCover: false,
    artistName: "Hidden Artist",
    releaseTitle: "Hidden Title",
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.serviceDetails.includeTextOnCover, false)
  assert.equal(result.serviceDetails.artistName, undefined)
  assert.equal(result.serviceDetails.trackTitle, undefined)

  const json = stringifyServiceDetails(result.serviceDetails)
  assert.ok(json)
  const parsed = JSON.parse(json!) as Record<string, unknown>
  assert.equal(parsed.includeTextOnCover, false)
  assert.equal("artistName" in parsed, false)
  assert.equal("trackTitle" in parsed, false)
})

test("stringifyServiceDetails persists includeTextOnCover boolean", () => {
  const withText = stringifyServiceDetails({
    includeTextOnCover: true,
    artistName: "A",
    trackTitle: "B",
    comment: "ok",
  })
  assert.ok(withText)
  assert.deepEqual(JSON.parse(withText!), {
    includeTextOnCover: true,
    artistName: "A",
    trackTitle: "B",
    comment: "ok",
  })

  const withoutText = stringifyServiceDetails({
    includeTextOnCover: false,
    comment: "ok",
    contactType: "telegram",
    contactValue: "@x",
  })
  assert.ok(withoutText)
  assert.equal(JSON.parse(withoutText!).includeTextOnCover, false)
})

test("stringifyServiceDetails preserves lyrics newlines and chorus repeats", () => {
  const lyrics = "Куплет один\nПрипев\nПрипев\n\nКуплет два"
  const json = stringifyServiceDetails({
    fileUrl: "https://example.com/track.wav",
    lyricsText: `  ${lyrics}  `,
    comment: "версия 2",
  })
  assert.ok(json)
  const parsed = JSON.parse(json!) as {
    lyricsText?: string
    fileUrl?: string
    comment?: string
  }
  assert.equal(parsed.lyricsText, lyrics)
  assert.equal(parsed.fileUrl, "https://example.com/track.wav")
  assert.equal(parsed.comment, "версия 2")
})
