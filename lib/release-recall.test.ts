import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  canUserRecallReleaseToDraft,
  releaseHasCatalogNumber,
} from "../lib/release-recall"

describe("release-recall", () => {
  it("detects catalog number on any track", () => {
    assert.equal(releaseHasCatalogNumber([{ catalogNumber: null }]), false)
    assert.equal(releaseHasCatalogNumber([{ catalogNumber: "  " }]), false)
    assert.equal(
      releaseHasCatalogNumber([{ catalogNumber: null }, { catalogNumber: "PRLXM1" }]),
      true
    )
  })

  it("allows recall only on_moderation without catalog", () => {
    assert.equal(
      canUserRecallReleaseToDraft({ status: "on_moderation" }, [{ catalogNumber: null }]),
      true
    )
    assert.equal(
      canUserRecallReleaseToDraft({ status: "on_moderation" }, [{ catalogNumber: "X" }]),
      false
    )
    assert.equal(
      canUserRecallReleaseToDraft({ status: "draft" }, [{ catalogNumber: null }]),
      false
    )
    assert.equal(
      canUserRecallReleaseToDraft({ status: "sent_to_platforms" }, [{ catalogNumber: null }]),
      false
    )
  })
})
