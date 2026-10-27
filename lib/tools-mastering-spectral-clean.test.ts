import test from "node:test"
import assert from "node:assert/strict"
import {
  AI_CLEAN_LIMITS,
  assertAiCleanDurationOk,
  fftRadix2,
  spectralCleanStrength,
} from "./tools-mastering-spectral-clean"

test("spectralCleanStrength protects bass and ramps highs", () => {
  assert.equal(spectralCleanStrength(100), 0)
  assert.equal(spectralCleanStrength(AI_CLEAN_LIMITS.bassProtectHz - 1), 0)
  assert.equal(spectralCleanStrength(500), AI_CLEAN_LIMITS.strengthMid)
  assert.equal(spectralCleanStrength(AI_CLEAN_LIMITS.strengthFullHz), 1)
  const mid = spectralCleanStrength(6000)
  assert.ok(mid > AI_CLEAN_LIMITS.strengthMid && mid < 1)
})

test("assertAiCleanDurationOk rejects too long files", () => {
  assert.doesNotThrow(() => assertAiCleanDurationOk(60))
  assert.throws(() => assertAiCleanDurationOk(AI_CLEAN_LIMITS.maxDurationSec + 1))
})

test("fftRadix2 roundtrip roughly restores impulse", () => {
  const n = 32
  const re = new Float64Array(n)
  const im = new Float64Array(n)
  re[0] = 1
  fftRadix2(re, im, false)
  fftRadix2(re, im, true)
  assert.ok(Math.abs(re[0] - 1) < 1e-9)
  for (let i = 1; i < n; i++) {
    assert.ok(Math.abs(re[i]) < 1e-9)
    assert.ok(Math.abs(im[i]) < 1e-9)
  }
})

test("applySpectralClean returns same length stereo", async () => {
  const { applySpectralClean } = await import("./tools-mastering-spectral-clean")
  const sr = 16000
  const n = sr * 2
  const left = new Float32Array(n)
  const right = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const t = i / sr
    left[i] = 0.2 * Math.sin(2 * Math.PI * 440 * t) + 0.02 * (Math.random() * 2 - 1)
    right[i] = 0.2 * Math.sin(2 * Math.PI * 440 * t + 0.1) + 0.02 * (Math.random() * 2 - 1)
  }
  const out = applySpectralClean({ sampleRate: sr, channels: [left, right] })
  assert.equal(out.channels.length, 2)
  assert.equal(out.channels[0].length, n)
  assert.equal(out.channels[1].length, n)
  let peak = 0
  for (let i = 0; i < n; i++) {
    peak = Math.max(peak, Math.abs(out.channels[0][i]), Math.abs(out.channels[1][i]))
  }
  assert.ok(peak > 0.01)
})
