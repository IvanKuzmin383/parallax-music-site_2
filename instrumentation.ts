// Дублируем лимит libvips на случай, если instrumentation выполнится до чтения next.config.
if (typeof process !== "undefined" && process.env.NEXT_RUNTIME !== "edge") {
  process.env.VIPS_CONCURRENCY ??= "1"
  process.env.LIBVIPS_CONCURRENCY ??= "1"
}

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "edge") return

  const { startNodeRuntimeMetrics } = await import("@/lib/node-runtime-metrics")
  startNodeRuntimeMetrics()
}
