import sharp from "sharp"
import { AsyncSemaphore } from "@/lib/async-semaphore"

let configured = false

/**
 * Один раз на процесс: ограничиваем libvips и очередь тяжёлых ресайзов обложек,
 * чтобы параллельные GET не забивали все ядра cgroup и не блокировали остальной Node.
 */
export function ensureCabinetCoverSharpConfigured(): void {
  if (configured) return
  configured = true
  sharp.cache({ memory: 32, files: 0, items: 64 })
  // Не даём одному процессу раздувать пул потоков libvips под каждое изображение
  sharp.concurrency(1)
}

/** Не более одного одновременного Sharp-пайплайна на обложки кабинета (остальные ждут в очереди). */
export const cabinetCoverSharpSemaphore = new AsyncSemaphore(1)
