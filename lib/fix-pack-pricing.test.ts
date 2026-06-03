import test from "node:test"
import assert from "node:assert/strict"
import {
  calculateFixPackTotalRub,
  getFixPackUnitPriceRub,
  MAX_FIX_PACK_ORDER,
} from "./fix-pack-pricing"

test("getFixPackUnitPriceRub tier boundaries", () => {
  assert.equal(getFixPackUnitPriceRub(1), 500)
  assert.equal(getFixPackUnitPriceRub(5), 500)
  assert.equal(getFixPackUnitPriceRub(6), 400)
  assert.equal(getFixPackUnitPriceRub(10), 400)
  assert.equal(getFixPackUnitPriceRub(11), 350)
  assert.equal(getFixPackUnitPriceRub(MAX_FIX_PACK_ORDER), 350)
})

test("calculateFixPackTotalRub examples", () => {
  assert.equal(calculateFixPackTotalRub(1), 500)
  assert.equal(calculateFixPackTotalRub(5), 2500)
  assert.equal(calculateFixPackTotalRub(6), 2400)
  assert.equal(calculateFixPackTotalRub(10), 4000)
  assert.equal(calculateFixPackTotalRub(11), 3850)
  assert.equal(calculateFixPackTotalRub(50), 17500)
})
