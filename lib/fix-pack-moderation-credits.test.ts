import test from "node:test"
import assert from "node:assert/strict"
import { countTracksNeedingFixPackCharge } from "./fix-pack-moderation-credits"

test("countTracksNeedingFixPackCharge counts only uncharged tracks", () => {
  assert.equal(
    countTracksNeedingFixPackCharge([
      { fixPackCreditsCharged: false },
      { fixPackCreditsCharged: true },
      { fixPackCreditsCharged: false },
    ]),
    2
  )
  assert.equal(countTracksNeedingFixPackCharge([{ fixPackCreditsCharged: true }]), 0)
})
