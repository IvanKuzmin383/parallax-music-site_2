import test from "node:test"
import assert from "node:assert/strict"
import { DEFAULT_AI_TRACKS_DRAFT } from "./ai-tracks-types"
import {
  buildPromptParts,
  normalizeAiTracksDraft,
  validateAiTracksDraft,
} from "./ai-tracks-validation"

test("simple mode requires non-empty idea", () => {
  const errors = validateAiTracksDraft({ ...DEFAULT_AI_TRACKS_DRAFT, idea: "   " })
  assert.equal(errors[0]?.field, "idea")
})

test("advanced vocal requires lyrics and style", () => {
  const errors = validateAiTracksDraft({
    ...DEFAULT_AI_TRACKS_DRAFT,
    mode: "advanced",
    instrumental: false,
    lyrics: "",
    style: "",
  })
  assert.ok(errors.some((e) => e.field === "lyrics"))
  assert.ok(errors.some((e) => e.field === "style"))
})

test("instrumental advanced requires style only", () => {
  const errors = validateAiTracksDraft({
    ...DEFAULT_AI_TRACKS_DRAFT,
    mode: "advanced",
    instrumental: true,
    lyrics: "",
    style: "ambient pads",
  })
  assert.equal(errors.length, 0)
})

test("direction and mood enrich prompt without replacing idea", () => {
  const draft = normalizeAiTracksDraft({
    mode: "simple",
    idea: "ночная поездка",
    direction: "pop",
    mood: "energetic",
  })
  const parts = buildPromptParts(draft)
  assert.match(parts.prompt, /ночная поездка/)
  assert.match(parts.prompt, /поп/)
  assert.match(parts.prompt, /энергичное/)
})

test("normalize preserves lyrics newlines and repeats", () => {
  const lyrics = "Припев:\nla la\nПрипев:\nla la\n"
  const draft = normalizeAiTracksDraft({ mode: "advanced", lyrics })
  assert.equal(draft.lyrics, lyrics)
})
