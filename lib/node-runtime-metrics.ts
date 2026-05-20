import v8 from "node:v8"

let started = false

function toMiB(bytes: number): number {
  return Math.round((bytes / 1024 / 1024) * 100) / 100
}

/**
 * Периодический stdout-лог для сопоставления дашборда контейнера (cgroup) с процессом Node.
 * Amvera: вкладка «Лог приложения».
 *
 * DIAGNOSTIC_MEMORY_INTERVAL_MS - интервал в мс (по умолчанию 60000). 0 - выключить.
 */
export function startNodeRuntimeMetrics(): void {
  if (started) return

  const raw = process.env.DIAGNOSTIC_MEMORY_INTERVAL_MS
  const intervalMs = raw === undefined || raw === "" ? 60_000 : Number(raw)
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return

  started = true

  let lastCpu = process.cpuUsage()

  const tick = () => {
    const mem = process.memoryUsage()
    const cpuNow = process.cpuUsage()
    const cpuUserUs = cpuNow.user - lastCpu.user
    const cpuSystemUs = cpuNow.system - lastCpu.system
    lastCpu = cpuNow

    const payload: Record<string, string | number | undefined> = {
      type: "diag_mem",
      ts: new Date().toISOString(),
      rssMiB: toMiB(mem.rss),
      heapUsedMiB: toMiB(mem.heapUsed),
      heapTotalMiB: toMiB(mem.heapTotal),
      externalMiB: toMiB(mem.external),
      uptimeSec: Math.round(process.uptime()),
      cpuUserMsSinceLast: Math.round(cpuUserUs / 1000),
      cpuSystemMsSinceLast: Math.round(cpuSystemUs / 1000),
    }

    if (typeof mem.arrayBuffers === "number") {
      payload.arrayBuffersMiB = toMiB(mem.arrayBuffers)
    }

    try {
      const h = v8.getHeapStatistics()
      payload.heapLimitMiB = toMiB(h.heap_size_limit)
      payload.heapUsedNativeMiB = toMiB(h.used_heap_size)
    } catch {
      // ignore
    }

    console.log(JSON.stringify(payload))
  }

  tick()
  setInterval(tick, intervalMs)
}
