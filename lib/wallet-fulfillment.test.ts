import test from "node:test"
import assert from "node:assert/strict"
import { fulfillWalletPaidOrder, walletFulfillmentTarget } from "./wallet-fulfillment"
import type { OrderFixPack, OrderTracksTopup } from "./orders"

test("walletFulfillmentTarget: fix_pack goes to dedicated fulfill, not generic", () => {
  assert.equal(walletFulfillmentTarget("fix_pack"), "fix_pack")
  assert.equal(walletFulfillmentTarget("tracks_topup"), "generic")
  assert.equal(walletFulfillmentTarget("ai_mastering"), "generic")
  assert.equal(walletFulfillmentTarget("wallet_topup"), "generic")
})

test("fulfillWalletPaidOrder calls fulfillFixPack for fix_pack and not generic", async () => {
  const order: OrderFixPack = {
    id: "ord-fix",
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    orderType: "fix_pack",
    userEmail: "a@b.c",
    tracksCount: 3,
    totalAmount: "1500.00",
    userId: "user-1",
  }
  let fixCalls = 0
  let genericCalls = 0
  const target = await fulfillWalletPaidOrder(
    {
      order,
      paymentId: "wallet:tx-1",
      paidAt: "2026-01-01T00:00:01.000Z",
      amountRub: "1500.00",
    },
    {
      fulfillFixPack: async () => {
        fixCalls += 1
      },
      fulfillGeneric: async () => {
        genericCalls += 1
      },
    },
  )
  assert.equal(target, "fix_pack")
  assert.equal(fixCalls, 1)
  assert.equal(genericCalls, 0)
})

test("fulfillWalletPaidOrder calls generic fulfill for non-fix orders", async () => {
  const order: OrderTracksTopup = {
    id: "ord-topup",
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    orderType: "tracks_topup",
    userId: "user-1",
    tracksCount: 2,
    totalAmount: "800.00",
  }
  let fixCalls = 0
  let genericCalls = 0
  const target = await fulfillWalletPaidOrder(
    {
      order,
      paymentId: "wallet:tx-2",
      paidAt: "2026-01-01T00:00:01.000Z",
      amountRub: "800.00",
    },
    {
      fulfillFixPack: async () => {
        fixCalls += 1
      },
      fulfillGeneric: async () => {
        genericCalls += 1
      },
    },
  )
  assert.equal(target, "generic")
  assert.equal(fixCalls, 0)
  assert.equal(genericCalls, 1)
})
