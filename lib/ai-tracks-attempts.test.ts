import test from "node:test"
import assert from "node:assert/strict"
import {
  createMemoryAttemptStore,
  runAddAttempts,
  runCommitAttempt,
  runRefundAttempt,
  runReserveAttempt,
} from "./ai-tracks-attempts"

test("reserve then commit is idempotent", async () => {
  const store = createMemoryAttemptStore({ u1: 3 })
  const r1 = await runReserveAttempt(store, "u1", "job-1", 1)
  assert.equal(r1.ok, true)
  if (!r1.ok) return
  assert.equal(r1.attempts, 2)

  const r2 = await runReserveAttempt(store, "u1", "job-1", 1)
  assert.equal(r2.ok, true)
  if (!r2.ok) return
  assert.equal(r2.already, true)
  assert.equal(r2.attempts, 2)

  const c1 = await runCommitAttempt(store, "u1", "job-1")
  assert.equal(c1.ok, true)
  if (!c1.ok) return
  assert.equal(c1.attempts, 2)

  const c2 = await runCommitAttempt(store, "u1", "job-1")
  assert.equal(c2.ok, true)
  if (!c2.ok) return
  assert.equal(c2.already, true)
  assert.equal(c2.attempts, 2)
})

test("reserve then refund restores balance once", async () => {
  const store = createMemoryAttemptStore({ u1: 1 })
  const r = await runReserveAttempt(store, "u1", "job-2", 1)
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.equal(r.attempts, 0)

  const f1 = await runRefundAttempt(store, "u1", "job-2")
  assert.equal(f1.ok, true)
  if (!f1.ok) return
  assert.equal(f1.attempts, 1)

  const f2 = await runRefundAttempt(store, "u1", "job-2")
  assert.equal(f2.ok, true)
  if (!f2.ok) return
  assert.equal(f2.already, true)
  assert.equal(f2.attempts, 1)
})

test("last attempt race: only one reserve succeeds", async () => {
  const store = createMemoryAttemptStore({ u1: 1 })
  const first = await runReserveAttempt(store, "u1", "job-a", 1)
  const second = await runReserveAttempt(store, "u1", "job-b", 1)

  assert.equal(first.ok, true)
  assert.equal(second.ok, false)
  if (second.ok) return
  assert.equal(second.error, "insufficient")
  assert.equal(second.attempts, 0)
})

test("cannot refund after commit", async () => {
  const store = createMemoryAttemptStore({ u1: 2 })
  await runReserveAttempt(store, "u1", "job-3", 1)
  await runCommitAttempt(store, "u1", "job-3")
  const refund = await runRefundAttempt(store, "u1", "job-3")
  assert.equal(refund.ok, false)
  if (refund.ok) return
  assert.equal(refund.error, "no_reserve")
})

test("cannot commit after refund", async () => {
  const store = createMemoryAttemptStore({ u1: 2 })
  await runReserveAttempt(store, "u1", "job-4", 1)
  await runRefundAttempt(store, "u1", "job-4")
  const commit = await runCommitAttempt(store, "u1", "job-4")
  assert.equal(commit.ok, false)
  if (commit.ok) return
  assert.equal(commit.error, "no_reserve")
})

test("addAttempts increases balance", async () => {
  const store = createMemoryAttemptStore({ u1: 0 })
  const next = await runAddAttempts(store, "u1", 5)
  assert.deepEqual(next, { attempts: 5 })
})

test("parallel last-attempt simulation with mutex still allows only one", async () => {
  const store = createMemoryAttemptStore({ u1: 1 })
  let chain = Promise.resolve()
  const withLock = <T>(fn: () => Promise<T>) => {
    const run = chain.then(fn, fn)
    chain = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }

  const results = await Promise.all([
    withLock(() => runReserveAttempt(store, "u1", "job-x", 1)),
    withLock(() => runReserveAttempt(store, "u1", "job-y", 1)),
  ])

  const okCount = results.filter((r) => r.ok).length
  const failCount = results.filter((r) => !r.ok).length
  assert.equal(okCount, 1)
  assert.equal(failCount, 1)
})
