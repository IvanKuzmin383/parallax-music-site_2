import test from "node:test"
import assert from "node:assert/strict"
import { AI_TRACKS_PACKS, AI_TRACKS_PRICE_RUB } from "./ai-tracks-config"
import { getAiTracksPublicConfig } from "./ai-tracks-config-server"

test("packs are empty; generation billed from wallet at fixed price", () => {
  assert.equal(AI_TRACKS_PACKS.length, 0)
  assert.equal(AI_TRACKS_PRICE_RUB, 30)
  const cfg = getAiTracksPublicConfig()
  assert.equal(cfg.packsAvailable, false)
  assert.equal(cfg.priceRub, 30)
  assert.equal(cfg.costAttempts, 0)
  assert.equal(cfg.generationEnabled, false)
  assert.ok(cfg.unavailableReason)
  assert.ok(cfg.models.some((m) => m.id === "V6"))
})
