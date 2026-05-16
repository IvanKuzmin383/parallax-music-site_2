/**
 * Очередь задач с ограничением параллелизма (для тяжёлого native-кода вроде Sharp).
 */
export class AsyncSemaphore {
  private active = 0

  constructor(private readonly maxConcurrent: number) {
    if (maxConcurrent < 1) throw new Error("maxConcurrent must be >= 1")
  }

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire()
    try {
      return await fn()
    } finally {
      this.release()
    }
  }

  private queue: Array<() => void> = []

  private acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active += 1
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active += 1
        resolve()
      })
    })
  }

  private release(): void {
    this.active -= 1
    const next = this.queue.shift()
    if (next) next()
  }
}
