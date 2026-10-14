import test from "node:test"
import assert from "node:assert/strict"
import { AI_TRACKS_PACKS } from "./ai-tracks-config"
import { getAiTracksPublicConfig } from "./ai-tracks-config-server"

test("packs are empty until prices are approved", () => {
  assert.equal(AI_TRACKS_PACKS.length, 0)
  const cfg = getAiTracksPublicConfig()
  assert.equal(cfg.packsAvailable, false)
  assert.equal(cfg.generationEnabled, false)
  assert.ok(cfg.unavailableReason)
})
